import manifest from './source-manifest.json';
import catalog from './app-catalog.json';
import {createDemoFixtures,baseVersion} from './demo-fixtures';
import {parseDatabase,sourceDocumentSchema,appSchema} from '../domain/schemas';
import type {Database,Resource} from '../domain/types';
import {resourceMetadata} from '../domain/visibility';
export function createSeed():Database {
 const fixtures=createDemoFixtures();
 const sources=manifest.map(value=>sourceDocumentSchema.parse(value));
 const apps=catalog.map(value=>appSchema.parse(value));
 for(const source of sources){
  const id=`source-resource-${source.instrumentId}`,versionId=`${id}-v1`;
  const resource:Resource={id,title:source.originalName.replace(/\.pptx$/,''),description:'실제 PPTX 원자료 메타데이터입니다. 본문은 앱에 포함하지 않으며, 음악 검수와 권리 확인 전까지 비공개입니다.',instrument:source.instrumentId,instrumentSystem:'unknown',kind:'textbook',level:null,objectives:[],topics:['원자료','검수 전'],prerequisites:[],estimatedMinutes:0,datasetKind:'source_unreviewed',currentDraftVersionId:versionId,publishedVersionId:null,publicationState:'private',sourceRefs:[{id:source.id,title:source.originalName,url:source.originalUrl,chapter:null,pageRange:null}],editorialUnitIds:[],modulePlanIds:[],notationKinds:['unknown'],jangdanNames:[]};
  fixtures.resources.push(resource);
  fixtures.versions.push({...baseVersion(versionId,id,source.instrumentId),aiUsage:'교육 내용 생성 없음. 원자료 파일 메타데이터만 등록.',changeSummary:'PPTX 파일·추출 상태 메타데이터 등록. 본문·편집 단원 앱 미탑재.'});
  fixtures.assets.push({id:`asset-source-${source.instrumentId}-pptx`,resourceVersionId:versionId,format:'pptx_source',fileRef:null,pageCount:null,checksum:null,availability:'missing',rights:{allowView:false,allowPrint:false,allowDownload:false}});
 }
 fixtures.versions.forEach(version=>{const resource=fixtures.resources.find(resource=>resource.id===version.resourceId)!;version.resourceSnapshot=resourceMetadata(resource);});
 return parseDatabase({schemaVersion:1,revision:0,commandIds:[],...fixtures,sources,sourceSlides:[],editorialUnits:[],apps,issues:[],events:[],bookmarks:[],positions:[]});
}
export const getSeed = createSeed;
