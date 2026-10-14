export const instrumentIds = ['gayageum','geomungo','daegeum','danso','saenghwang','sogeum','ajaeng','yanggeum','janggu','cheolhyeongeum','taepyeongso','piri','percussion-samulnori','haegeum'] as const;
export type Instrument = typeof instrumentIds[number];
export type Audience = 'public' | 'demo' | 'admin';
export type ReviewState = 'draft' | 'in_review' | 'changes_requested' | 're_review' | 'approved' | 'rejected';
export type PublicationState = 'private' | 'published' | 'on_hold';
export type RightsState = 'unknown' | 'pending' | 'cleared' | 'restricted';
export type DatasetKind = 'source_unreviewed' | 'synthetic_demo' | 'reviewed_real';
export type LinkStatus = 'todo' | 'unchecked' | 'available' | 'broken' | 'restricted';
export type NotationKind = 'jeongganbo' | 'staff' | 'yulja' | 'gueum' | 'mixed' | 'other' | 'unknown';
export type EvidenceState = 'unconfirmed' | 'source_observed' | 'expert_reviewed';
export interface EvidenceValue<T> { value:T|null; state:EvidenceState; sourceSlideIds:string[]; reviewerId:string|null; reviewedAt:string|null }
export interface SourceRef { id:string; title:string; url:string|null; chapter:string|null; pageRange:string|null; originalFieldName?:string }
export interface RightsRecord { state:RightsState; holder:string|null; license:string|null; evidenceRef:string|null; allowView:boolean; allowPrint:boolean; allowDownload:boolean; allowRedistribute:boolean; checkedAt:string|null; checkedBy:string|null }
export interface Resource { id:string; title:string; description:string; instrument:Instrument; instrumentSystem:string; kind:'textbook'|'score'|'diagram'|'activity'; level:1|2|3|null; objectives:string[]; topics:string[]; prerequisites:string[]; estimatedMinutes:number; datasetKind:DatasetKind; currentDraftVersionId:string; publishedVersionId:string|null; publicationState:PublicationState; sourceRefs:SourceRef[]; editorialUnitIds:string[]; modulePlanIds:string[]; notationKinds:NotationKind[]; jangdanNames:string[] }
export interface GugakContext { instrumentId:Instrument; originalClassification:string|null; variant:EvidenceValue<string>; stringCount:EvidenceValue<number>; tuning:EvidenceValue<string>; soundingRange:EvidenceValue<string>; notationKinds:NotationKind[]; pitchSystem:EvidenceValue<string>; referencePitch:EvidenceValue<string>; genreOrTradition:EvidenceValue<string>; techniqueTerms:EvidenceValue<string[]>; jangdan:EvidenceValue<{name:string;variant:string|null;beats:string|null;subdivisions:string|null;hanbae:string|null;gueum:string|null}>; jeonggan:EvidenceValue<{readingDirection:string;gridDescription:string;yulNames:string[];symbolsLegend:string|null}> }
export type ResourceMetadata = Pick<Resource,'title'|'description'|'instrumentSystem'|'kind'|'level'|'objectives'|'topics'|'prerequisites'|'estimatedMinutes'|'sourceRefs'|'notationKinds'|'jangdanNames'>;
export interface ResourceVersion { resourceSnapshot?:ResourceMetadata; id:string; resourceId:string; version:string; reviewState:ReviewState; rights:RightsRecord; unitIds:string[]; aiUsage:string; reviewScope:string|null; reviewerDisplayName:string|null; reviewerNameConsent:boolean; reviewedAt:string|null; approvedBy:string|null; approvedAt:string|null; approvalEvidenceRef:string|null; basedOnVersionId:string|null; changeSummary:string; revision:number; createdAt:string; gugakContext:GugakContext; editorialUnitIds:string[] }
export interface ContentBlock { id:string; type:'paragraph'|'image'|'score'|'audio'|'jeonggan'|'gugak_notation'; text?:string; src?:string; alt?:string; caption?:string }
export interface Unit { id:string; resourceVersionId:string; order:number; title:string; blocks:ContentBlock[]; appLinkIds:string[] }
export interface AppLink { revision:number; id:string; title:string; url:string|null; sourceDocumentUrl:string; instruments:Instrument[]; instrumentSystem:string|null; scope:'mvp_candidate'|'common_tool'|'other'|'excluded_mismatch'; purpose:string; level:number|null; status:LinkStatus; checkedAt:string|null; checkEvidence:string|null; contentAccuracyChecked:boolean; requiresCamera:'yes'|'no'|'unknown'; requiresMicrophone:'yes'|'no'|'unknown'; requiresLogin:'yes'|'no'|'unknown'; enabled:boolean; fallbackResourceId:string|null; sourceEvidence:string|null; availabilityCheck:boolean; contentCompatibilityCheck:boolean; privacyPermissionCheck:boolean; notationKinds:NotationKind[]; objectives:string[] }
export interface SourceDocument { id:string; driveFileId:string; originalName:string; instrumentId:Instrument; mimeType:string; byteSize:number|null; modifiedTime:string|null; sha256:string|null; slideCount:number|null; extractionState:'metadata_only'|'text_extracted'|'visual_checked'|'failed'; rightsState:RightsState; originalUrl:string }
export interface SourceSlide { id:string; sourceDocumentId:string; slideNumber:number; originalText:string; notesText:string|null; textExtractionComplete:boolean; visualCheckState:'unchecked'|'checked'|'needs_review'; extractedAssets:Array<{id:string;kind:string;rightsState:RightsState}> }
export interface EditorialUnit { id:string; instrumentId:Instrument; title:string; sourceSlideIds:string[]; originalTextRef:string; editedBlocks:ContentBlock[]; contentOrigin:'source_transcription'|'ai_assisted'|'human_authored'|'synthetic_demo'; editRevision:number; changedBy:string; changeSummary:string; mappingState:'proposed'|'reviewed'; resourceVersionId:string|null }
export interface ModulePlan { id:string; instrument:Instrument; slot:number; title:string; editorialUnitIds:string[]; mappingState:'proposed'|'reviewed' }
export interface ReviewIssue { id:string; resourceId:string; versionId:string; unitId:string|null; blockId:string|null; category:'music'|'pedagogy'|'safety'|'rights'|'other'; severity:'critical'|'major'|'minor'; description:string; evidence:string; suggestion:string; resolution:string|null; status:'open'|'fixed'|'verified'|'dismissed'; dismissalReason:string|null }
export interface ReviewEvent { id:string; resourceId:string; versionId:string; from:ReviewState; to:ReviewState; actorId:string; role:string; reason:string; at:string; snapshotRevision:number }
export interface Activity { id:string; phase:'intro'|'main'|'wrapup'; title:string; minutes:number; teacherNotes:string; alternative:string; resources:Array<{resourceId:string;versionId:string;unitId:string}>; appLinkIds:string[] }
export interface LessonPlan { id:string; title:string; instrument:Instrument; targetLevel:1|2|3; objectives:string[]; durationMinutes:number; materials:string[]; activities:Activity[]; isDemo:boolean; updatedAt:string; revision:number; instrumentSystem?:string|null }
export interface Bookmark { resourceId:string; versionId:string; unitId:string|null }
export interface ReadingPosition { resourceId:string; versionId:string; unitId:string; updatedAt:string }
export interface BookPosition { projectId:'gugak-library'; resourceId:string; resourceVersionId:string; assetId:string; pageNumber:number|null; unitId:string|null; updatedAt:string }
export interface ReadingAsset { id:string; resourceVersionId:string; format:'pdf'|'structured'|'pptx_source'; fileRef:string|null; pageCount:number|null; checksum:string|null; availability:'missing'|'processing'|'available'|'failed'|'on_hold'; rights:{allowView:boolean;allowPrint:boolean;allowDownload:boolean} }
export interface BookPresentation { resourceId:string; resourceVersionId:string; coverAssetId:string|null; coverOrigin:'provided'|'generated_typography'|'none'; shelfOrder:number|null; displayTitle:string }
export interface Database { schemaVersion:1; revision:number; commandIds:string[]; resources:Resource[]; versions:ResourceVersion[]; units:Unit[]; sources:SourceDocument[]; sourceSlides:SourceSlide[]; editorialUnits:EditorialUnit[]; apps:AppLink[]; plans:LessonPlan[]; issues:ReviewIssue[]; events:ReviewEvent[]; bookmarks:Bookmark[]; positions:BookPosition[]; assets:ReadingAsset[] }
export interface ResourceQuery { q?:string; instruments?:Instrument[]; families?:string[]; kinds?:Resource['kind'][]; levels?:Array<1|2|3|'unknown'>; notationKinds?:NotationKind[]; instrumentSystems?:string[]; jangdanNames?:string[]; objectives?:string[]; sort?:'title'|'instrument'|'level'|'recent' }
export interface ReviewCommand { target:ReviewState; actorId:string; role:'editor'|'reviewer'; reason:string; reviewScope?:string; evidenceRef?:string; at?:string; commandId?:string }
export class DomainValidationError extends Error { readonly code='validation_error'; constructor(message:string){ super(message); this.name='DomainValidationError'; } }
export const instruments: Array<{id:Instrument;name:string;family:'현악'|'관악'|'타악'|'묶음';color:string;english:string}> = [
  {id:'gayageum',name:'가야금',family:'현악',color:'#9b493e',english:'Gayageum'},
  {id:'geomungo',name:'거문고',family:'현악',color:'#715342',english:'Geomungo'},
  {id:'daegeum',name:'대금',family:'관악',color:'#326454',english:'Daegeum'},
  {id:'danso',name:'단소',family:'관악',color:'#507659',english:'Danso'},
  {id:'saenghwang',name:'생황',family:'관악',color:'#a57c3e',english:'Saenghwang'},
  {id:'sogeum',name:'소금',family:'관악',color:'#446b65',english:'Sogeum'},
  {id:'ajaeng',name:'아쟁',family:'현악',color:'#76534b',english:'Ajaeng'},
  {id:'yanggeum',name:'양금',family:'현악',color:'#ab8247',english:'Yanggeum'},
  {id:'janggu',name:'장구',family:'타악',color:'#a14935',english:'Janggu'},
  {id:'cheolhyeongeum',name:'철현금',family:'현악',color:'#56667a',english:'Cheolhyeongeum'},
  {id:'taepyeongso',name:'태평소',family:'관악',color:'#9f6d39',english:'Taepyeongso'},
  {id:'piri',name:'피리',family:'관악',color:'#64754c',english:'Piri'},
  {id:'percussion-samulnori',name:'타악기·사물놀이',family:'묶음',color:'#605274',english:'Percussion Samulnori'},
  {id:'haegeum',name:'해금',family:'현악',color:'#8c5368',english:'Haegeum'},
];
