#!/usr/bin/env python3
"""Read-only, bounded PPTX extraction. Never renders/executes or fetches links.

Raw output contains source text and must stay outside public/src and distributable
bundles until rights and review are cleared. New JSON files are exclusive-created
and made read-only; existing output is never overwritten. This is file immutability
by convention, not tamper-proof archival storage.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import stat
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
RNS = "{http://schemas.openxmlformats.org/package/2006/relationships}"

class UnsafeArchive(ValueError):
    pass

@dataclass(frozen=True)
class Limits:
    archive_bytes: int = 128 * 1024 * 1024
    entries: int = 6000
    member_bytes: int = 80 * 1024 * 1024
    expanded_bytes: int = 400 * 1024 * 1024
    xml_bytes: int = 12 * 1024 * 1024
    compression_ratio: int = 1000

def valid_member(name: str) -> bool:
    path = PurePosixPath(name)
    return bool(name) and not name.startswith("/") and "\\" not in name and ":" not in name and "\x00" not in name and all(p not in ("", ".", "..") for p in name.rstrip("/").split("/")) and not path.is_absolute()

def safe_xml(data: bytes, label: str, limit: int) -> ET.Element:
    if len(data) > limit:
        raise UnsafeArchive(f"XML size limit: {label}")
    # Scan a NUL-stripped form too: catches UTF-16/32 encoded DTD/entity markup.
    if re.search(br"<!\s*(DOCTYPE|ENTITY)\b", data.replace(b"\x00", b""), re.I):
        raise UnsafeArchive(f"DTD/entity declaration blocked: {label}")
    try:
        return ET.fromstring(data)
    except ET.ParseError as exc:
        raise UnsafeArchive(f"Invalid XML: {label}") from exc

def relationship_path(part: str) -> str:
    return posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")

def resolve_target(part: str, target: str) -> str:
    # Legitimate OOXML relationships commonly contain ../; resolve within ZIP only.
    if "\\" in target or "\x00" in target or ":" in target or target.startswith("//"):
        raise UnsafeArchive("Unsafe internal relationship target")
    # /ppt/... is a legitimate package-root URI, not an OS filesystem path.
    candidate = target[1:] if target.startswith("/") else posixpath.join(posixpath.dirname(part), target)
    resolved = posixpath.normpath(candidate)
    if not valid_member(resolved):
        raise UnsafeArchive("Relationship escapes archive")
    return resolved

def text_blocks(root: ET.Element) -> list[dict]:
    blocks = []
    for index, paragraph in enumerate(root.findall(".//a:p", NS), 1):
        # Preserve line break/tab nodes; no HTML interpretation or normalization.
        pieces = []
        for node in paragraph.iter():
            local = node.tag.rsplit("}", 1)[-1]
            if local == "t": pieces.append(node.text or "")
            elif local == "br": pieces.append("\n")
            elif local == "tab": pieces.append("\t")
        blocks.append({"paragraphIndex": index, "text": "".join(pieces)})
    return blocks

def extract(path: Path, source_id: str, limits: Limits = Limits()) -> dict:
    if path.stat().st_size > limits.archive_bytes:
        raise UnsafeArchive("Archive size limit")
    original = path.read_bytes()
    digest = hashlib.sha256(original).hexdigest()
    with zipfile.ZipFile(path) as z:
        entries = z.infolist()
        if len(entries) > limits.entries:
            raise UnsafeArchive("ZIP member count limit")
        seen, total, xml = set(), 0, {}
        for info in entries:
            if not valid_member(info.filename): raise UnsafeArchive("Unsafe ZIP member path")
            if info.filename in seen: raise UnsafeArchive("Duplicate ZIP member")
            seen.add(info.filename)
            if stat.S_ISLNK(info.external_attr >> 16): raise UnsafeArchive("ZIP symlink blocked")
            if info.flag_bits & 1: raise UnsafeArchive("Encrypted ZIP blocked")
            if "vbaproject" in info.filename.casefold(): raise UnsafeArchive("Macro project blocked")
            total += info.file_size
            if info.file_size > limits.member_bytes or total > limits.expanded_bytes:
                raise UnsafeArchive("Expanded ZIP size limit")
            if info.file_size > max(info.compress_size, 1) * limits.compression_ratio:
                raise UnsafeArchive("ZIP compression ratio limit")
            if info.filename.endswith((".xml", ".rels")):
                if info.file_size > limits.xml_bytes: raise UnsafeArchive("XML size limit")
                xml[info.filename] = safe_xml(z.read(info), info.filename, limits.xml_bytes)
        def rels(part):
            root = xml.get(relationship_path(part))
            if root is None: return {}
            return {r.attrib["Id"]: {"target": r.attrib.get("Target", ""),
                     "type": r.attrib.get("Type", ""),
                     "external": r.attrib.get("TargetMode") == "External"}
                    for r in root if r.tag == RNS + "Relationship"}
        presentation = xml.get("ppt/presentation.xml")
        if presentation is None: raise UnsafeArchive("Missing presentation.xml")
        p_rels = rels("ppt/presentation.xml")
        slides = []
        for number, node in enumerate(presentation.findall("p:sldIdLst/p:sldId", NS), 1):
            rid = node.attrib.get("{" + NS["r"] + "}id")
            relationship = p_rels.get(rid)
            if not relationship or relationship["external"]: raise UnsafeArchive("Invalid slide relationship")
            part = resolve_target("ppt/presentation.xml", relationship["target"])
            root = xml.get(part)
            if root is None: raise UnsafeArchive("Missing slide part")
            blocks = text_blocks(root)
            slide_rels = rels(part)
            notes = []
            assets, external = [], []
            for rel_id, rel in slide_rels.items():
                if rel["external"]:
                    external.append({"relationshipId": rel_id, "target": rel["target"], "type": rel["type"], "executed": False})
                    continue
                target = resolve_target(part, rel["target"])
                if rel["type"].endswith("/notesSlide") and target in xml:
                    notes.extend(text_blocks(xml[target]))
                elif any(rel["type"].endswith("/" + k) for k in ("image", "audio", "video", "oleObject")):
                    assets.append({"relationshipId": rel_id, "part": target, "kind": rel["type"].rsplit("/", 1)[-1], "rightsState": "unknown", "extracted": False})
            shape_refs = [{"id": n.attrib.get("id"), "name": n.attrib.get("name"), "description": n.attrib.get("descr")} for n in root.findall(".//p:cNvPr", NS)]
            slides.append({"id": f"{source_id}-slide-{number}", "sourceDocumentId": source_id,
                "slideNumber": number, "archivePart": part, "blocks": blocks,
                "originalText": "\n".join(b["text"] for b in blocks),
                "notesText": "\n".join(b["text"] for b in notes) or None,
                "textExtractionComplete": True, "visualCheckState": "unchecked",
                "ocrState": "not_performed", "shapes": shape_refs,
                "extractedAssets": assets, "externalLinks": external})
        return {"schemaVersion": 1, "sourceDocumentId": source_id, "sourceFileName": path.name,
            "sha256": digest, "byteSize": len(original), "slideCount": len(slides),
            "extractionState": "text_extracted", "rightsState": "unknown",
            "reviewState": "draft", "publicationState": "private",
            "extractedAt": datetime.now(timezone.utc).isoformat(),
            "note": "XML text observation only; no OCR, music review, visual review or rights approval.",
            "limits": vars(limits), "slides": slides}

def immutable_write(output: Path, data: dict) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, indent=2)
        out.write("\n")
    output.chmod(0o444)

def self_test() -> None:
    """Synthetic test corpus only. Returns nonzero if any rejection is absent."""
    p = '<p:presentation xmlns:p="'+NS['p']+'" xmlns:r="'+NS['r']+'"><p:sldIdLst><p:sldId id="1" r:id="rId1"/></p:sldIdLst></p:presentation>'
    r = '<Relationships xmlns="'+RNS[1:-1]+'"><Relationship Id="rId1" Type="x/slide" Target="slides/slide1.xml"/></Relationships>'
    s = '<p:sld xmlns:p="'+NS['p']+'" xmlns:a="'+NS['a']+'"><p:cSld><a:p><a:r><a:t>합성 안전 검사</a:t></a:r></a:p></p:cSld></p:sld>'
    base = {"ppt/presentation.xml": p, "ppt/_rels/presentation.xml.rels": r, "ppt/slides/slide1.xml": s}
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "fixture.pptx"
        def archive(extra=None):
            with zipfile.ZipFile(path, "w") as z:
                for k, v in {**base, **(extra or {})}.items(): z.writestr(k, v)
        archive()
        result = extract(path, "synthetic-test")
        assert result["slideCount"] == 1 and result["slides"][0]["originalText"] == "합성 안전 검사"
        out = Path(tmp) / "raw.json"
        immutable_write(out, result)
        try: immutable_write(out, result)
        except FileExistsError: pass
        else: raise AssertionError("Overwrite allowed")
        cases = [("traversal", {"../bad.xml": "<a/>"}, Limits()),
                 ("absolute", {"/bad.xml": "<a/>"}, Limits()),
                 ("backslash", {"..\\bad.xml": "<a/>"}, Limits()),
                 ("dtd", {"bad.xml": '<!DOCTYPE x [<!ENTITY x "y">]><x>&x;</x>'}, Limits()),
                 ("utf16-dtd", {"bad.xml": '<!DOCTYPE x [<!ENTITY x "y">]><x>&x;</x>'.encode("utf-16")}, Limits()),
                 ("macro", {"ppt/vbaProject.bin": b"fake"}, Limits()),
                 ("count", {}, Limits(entries=2)),
                 ("expanded-size", {}, Limits(expanded_bytes=10)),
                 ("xml-size", {}, Limits(xml_bytes=10)),
                 ("relationship-traversal", {"ppt/_rels/presentation.xml.rels": r.replace("slides/slide1.xml", "../../../bad.xml")}, Limits())]
        for name, extra, limits in cases:
            archive(extra)
            try: extract(path, "synthetic-test", limits)
            except UnsafeArchive: pass
            else: raise AssertionError("Unsafe archive accepted: " + name)
    print("PASS: valid synthetic extraction, immutable output, 10 unsafe-input cases")

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input", type=Path, nargs="?")
    ap.add_argument("--source-id")
    ap.add_argument("--output", type=Path)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test: self_test(); return
    if not all((args.input, args.source_id, args.output)): ap.error("input, --source-id and --output required")
    try:
        data = extract(args.input, args.source_id)
        immutable_write(args.output, data)
        print(json.dumps({k: data[k] for k in ("sourceDocumentId", "sha256", "byteSize", "slideCount", "extractionState")}, ensure_ascii=False))
    except (UnsafeArchive, zipfile.BadZipFile, OSError) as exc:
        print(f"Extraction failed: {exc}", file=sys.stderr)
        raise SystemExit(2)

if __name__ == "__main__": main()
