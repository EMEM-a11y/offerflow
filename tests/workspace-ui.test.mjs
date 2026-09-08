import test from "node:test";
import assert from "node:assert/strict";
import { captureWorkspaceFocus, syncWorkspaceUi, handleWorkspaceKeydown } from "../src/workspace-ui.js";

test("modal focus wraps in both directions and restores the original editor button",()=>{
  let active, prevented=0;
  const trigger={id:"edit",closest:()=>null,focus(){active=this}};
  const first={getClientRects:()=>[{}],focus(){active=this}};
  const last={getClientRects:()=>[{}],focus(){active=this}};
  const dialog={querySelector:()=>first,querySelectorAll:()=>[first,last]};
  let open=false; const shell={};
  const doc={body:{},get activeElement(){return active},getElementById:()=>trigger,querySelectorAll:()=>[],
    querySelector:s=>s==='[role="dialog"]'?(open?dialog:null):s===".app-shell"?shell:null};
  active=trigger; const previous=captureWorkspaceFocus(doc);
  open=true; syncWorkspaceUi(doc,previous);
  assert.equal(shell.inert,true); assert.equal(active,first);
  const event={key:"Tab",target:{closest:()=>null},preventDefault(){prevented++}};
  active=last; assert.equal(handleWorkspaceKeydown(event,doc),true); assert.equal(active,first);
  event.shiftKey=true; handleWorkspaceKeydown(event,doc); assert.equal(active,last); assert.equal(prevented,2);
  open=false;syncWorkspaceUi(doc,null);assert.equal(shell.inert,false);assert.equal(active,trigger);
});
test("tab lists expose selected state and arrow navigation activates the next tab",()=>{
  let clicked="",focused="";
  const tabs=["one","two"].map(id=>({id,attributes:[],classList:{contains:()=>id==="one"},setAttribute(k,v){this[k]=v},focus(){focused=id},click(){clicked=id},closest:s=>s==='[role="tablist"]'?list:null}));
  const list={querySelectorAll:()=>tabs};
  const doc={body:{},querySelector:()=>null,querySelectorAll:()=>[list],getElementById:id=>tabs.find(t=>t.id===id)};
  syncWorkspaceUi(doc,null);assert.equal(tabs[0]["aria-selected"],"true");assert.equal(tabs[1].tabIndex,-1);
  handleWorkspaceKeydown({key:"ArrowRight",target:{closest:()=>tabs[0]},preventDefault(){}},doc);
  assert.equal(clicked,"two");assert.equal(focused,"two");
});
