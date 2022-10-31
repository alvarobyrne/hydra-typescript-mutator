import Mutator from "./Mutator";
import "./style.css";
import dat from "dat.gui";
import CodeMutatorExplorer from "./CodeMutatorExplorer";

// import fs from "fs";
const gui = new dat.GUI();
gui.hide();
gui
  .add(
    {
      panes: () => {
        panes = 3;
        initUI();
      },
    },
    "panes"
  )
  .name("3 panes");
gui
  .add(
    {
      panes: () => {
        panes = 2;
        initUI();
      },
    },
    "panes"
  )
  .name("2 panes");
gui
  .add(
    {
      toggleDifferences: () => {
        dv.setShowDifferences((highlight = !highlight));
      },
    },
    "toggleDifferences"
  )
  .name("toggle diff highlight");
gui
  .add(
    {
      doConnect: () => {
        connect = connect ? null : "align";
        initUI();
      },
    },
    "doConnect"
  )
  .name("toggle pad changed");
gui
  .add(
    {
      toggleCollapse: () => {
        collapse = !collapse;
        initUI();
      },
    },
    "toggleCollapse"
  )
  .name("toggle collapse unchanged");

let value: string,
  orig1: string | undefined,
  orig2: string | undefined,
  dv: any,
  panes = 2,
  highlight = true,
  connect: string | null = "align",
  collapse = false;
function initUI() {
  if (value == null) return;
  var target = document.getElementById("view");
  if (target) target.innerHTML = "";
  //@ts-ignore
  dv = CodeMirror.MergeView(target, {
    value: value,
    origLeft: panes == 3 ? orig1 : null,
    orig: orig2,
    lineNumbers: true,
    mode: "javascript",
    highlightDifferences: highlight,
    connect: connect,
    collapseIdentical: collapse,
  });
}
window.onload = function () {
  load();
};
const load = async () => {
  const response = await fetch("code.txt");
  const codeRaw = await response.text();
  // console.log('codeRaw: ', codeRaw);
  const mutator = new Mutator();

  const codeArrayUntrimmed = codeRaw.split("---");
  codeArrayUntrimmed.shift();
  const codeArray = codeArrayUntrimmed.map((sketch) => {
    const trimmed = sketch.trim();
    const codeMutatroExplorer = new CodeMutatorExplorer(trimmed, mutator);
    codeMutatroExplorer.on("mutated", (data) => {
      console.log("data: ", data);
      value = data.original;
      orig2 = data.mutated;
      initUI();
    });
    return trimmed;
  });
  value = codeArray[0];
  console.log("value: ", value);
  orig1 = mutator.mutate(codeArray[0], {
    changeTransform: false,
    reroll: true,
  });
  orig2 = orig1;
  initUI();
  let d = document.createElement("div");
  console.log("d: ", d);
  d.style.cssText = "width: 50px; margin: 7px; height: 14px";
  d.style.backgroundColor = "red";
  dv.editor().addLineWidget(57, d);
};
