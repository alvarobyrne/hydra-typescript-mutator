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
  collapse = false,
  cm: any;
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
  cm = dv.editor();
}
window.onload = function () {
  load();
};
const load = async () => {
  const response = await fetch("code.txt");
  const codeRaw = await response.text();
  // console.log('codeRaw: ', codeRaw);
  const mutator = new Mutator();

  const codeArrayUntrimmed = codeRaw.split("****");
  codeArrayUntrimmed.shift();
  const codeArray = codeArrayUntrimmed.map((sketch) => {
    const trimmed = sketch.trim();
    const codeMutatroExplorer = new CodeMutatorExplorer(trimmed, mutator);
    codeMutatroExplorer.on("mutated", (data) => {
      // console.log("data: ", data);
      value = data.original;
      orig2 = data.mutated;
      initUI();
    });
    return trimmed;
  });
  value = codeArray[0];
  // console.log("value: ", value);
  orig1 = mutator.mutate(codeArray[0], {
    changeTransform: false,
    reroll: true,
    attempts: 5,
  });
  orig2 = orig1;
  initUI();
  let d = document.createElement("div");
  d.style.cssText = "width: 50px; margin: 7px; height: 14px";
  d.style.backgroundColor = "red";
  dv.editor().addLineWidget(57, d);
  addListeners();
  // placeSelection();
};
function addListeners() {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.shiftKey && e.ctrlKey) {
      const condition = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((x) => `Digit${x}`)
        .includes(e.code);
      if (condition) {
        replaceNumberByFunction(e);
      }
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.ctrlKey) {
      if (e.code === "Period") {
        e.preventDefault();
        selectWordAtCursor();
      } else if (e.code === "Comma") {
        e.preventDefault();
        selectWordAtCursor(false);
      }
    }
  });
}
const validTokenTypes = ["variable", "property", "number", "operator"];
const invalidOperators = ["=>"];
function selectWordAtCursor(isForward = true) {
  // console.clear();
  const start = isForward ? "head" : "anchor";
  const cursor = cm.getCursor(start);
  const { line: lineNumber } = cursor;
  let cursorCharacterPosition = cursor.ch;
  const lineTokens = cm.getLineTokens(lineNumber);
  let currentToken;
  /**
   * find the token at the current cursor position which is not of type null
   */
  for (let index = 0; index < lineTokens.length; index++) {
    const token = lineTokens[index];
    let isInRange = isForward
      ? token.start <= cursorCharacterPosition &&
        cursorCharacterPosition < token.end
      : token.start < cursorCharacterPosition &&
        cursorCharacterPosition <= token.end;
    const isValidType = validTokenTypes.includes(token.type);
    if (isInRange && isValidType) {
      currentToken = token;
      break;
    }
  }
  // console.log("currentToken: ", currentToken);
  const lastToken = lineTokens[lineTokens.length - 1];
  const lineLength = lastToken.end;
  const lastLine = cm.lastLine();
  if (currentToken) {
    const anchor = { line: lineNumber, ch: currentToken.start };
    const head = { line: lineNumber, ch: currentToken.end };
    cm.setSelection(anchor, head);
    const selection = cm.getSelection();
    const isInvalidOperator = invalidOperators.includes(selection);
    if (isInvalidOperator) {
      selectWordAtCursor(isForward);
    }
  } else {
    const sense = isForward ? 1 : -1;
    const nextPosition = cursorCharacterPosition + sense;
    const nextLine = lineNumber + sense;
    const nextPositionCondition = isForward
      ? nextPosition >= lineLength
      : nextPosition <= 0;
    if (nextPositionCondition) {
      const nextLinePositionCondition = isForward
        ? nextLine > lastLine
        : nextLine < 0;
      if (nextLinePositionCondition) {
        return;
      } else {
        let nextPosition2;
        if (isForward) {
          nextPosition2 = 0;
        } else {
          const lineTokens = cm.getLineTokens(nextLine);
          nextPosition2 = lineTokens[lineTokens.length - 1].end;
        }

        cm.setCursor(nextLine, nextPosition2);
      }
    } else {
      cm.setCursor(lineNumber, nextPosition);
    }
    selectWordAtCursor(isForward);
  }
}
function replaceNumberByFunction(e: KeyboardEvent) {
  e.preventDefault();
  const n = e.code.replace("Digit", "");
  console.log("n: ", n);
  // console.log("dv: ", dv.editor().doc);
  const doc = cm.doc;
  const selection = doc.getSelection();
  console.log("selection: ", selection);
  const number = Number(selection);
  if (isNaN(number)) return;
  if (!selection) {
    return;
  }
  const replacement = replacements[n];
  if (replacement) {
    doc.replaceSelection(replacement);
  }
}
const replacements: { [index: string]: string } = {
  "1": "()=>time",
  "2": "()=>Math.sin(time*1.0)*1.0",
  "3": "()=>(time/1)%1",
};
const appDiv = document.querySelector("#app")! as HTMLElement;
document.querySelector("#close-help")?.addEventListener("click", () => {
  appDiv.style.display = "none";
});
window.addEventListener("keydown", (e) => {
  if (e.code === "F1") {
    e.preventDefault();
    if (appDiv.style.display === "block" || appDiv.style.display === "") {
      appDiv.style.display = "none";
    } else {
      appDiv.style.display = "block";
    }
  }
});
