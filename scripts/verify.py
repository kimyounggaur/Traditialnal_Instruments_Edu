"""Run project checks and retain exact commands, time, exit codes and output."""
from pathlib import Path
from datetime import datetime,timezone
import subprocess,sys,time,json
root=Path(__file__).resolve().parent.parent
commands=[['npm','run','lint'],['npm','run','typecheck'],['npm','test'],['npm','run','build'],[sys.executable,'scripts/extract_pptx.py','--self-test']]
results=[]
log=root/'docs'/'verification.log'
with log.open('w',encoding='utf-8') as out:
    out.write('Gugak Library verification — '+datetime.now(timezone.utc).isoformat()+'\n')
    for command in commands:
        start=datetime.now(timezone.utc).isoformat();t=time.monotonic()
        out.write('\n$ '+' '.join(command)+'\nStarted: '+start+'\n');out.flush()
        print('RUN '+' '.join(command),flush=True)
        process=subprocess.run(command,cwd=root,stdout=out,stderr=subprocess.STDOUT)
        elapsed=round(time.monotonic()-t,2)
        result={'command':command,'startedAt':start,'seconds':elapsed,'exitCode':process.returncode}
        results.append(result);out.write(f'Exit: {process.returncode} | seconds: {elapsed}\n');out.flush()
        print(('PASS' if process.returncode==0 else 'FAIL')+f' {command} ({elapsed}s)',flush=True)
(root/'docs'/'verification-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
sys.exit(0 if all(x['exitCode']==0 for x in results) else 1)
