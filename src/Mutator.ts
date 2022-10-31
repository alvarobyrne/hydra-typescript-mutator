import "./style.css";
// import fs from "fs";
import { Parser, type Comment, type Node } from "acorn";
import {
  generatorTransforms,
  modifierTransforms,
  TransformDefinition,
} from "hydra-ts/src/glsl/transformDefinitions.js";
import { makeTraveler, attachComments } from "astravel";
import { generate } from "astring";
import beautify from "js-beautify";

type Position2 = {
  column: number;
  line: number;
};
type SourceLocation2 = {
  start: Position2;
  end: Position2;
};
type Node2 = {
  end: number;
  start: number;
  expression: Node2;
  property: Node2;
  callee: Node2;
  name: string;
  loc: SourceLocation2;
  type: string;
  value: string | number;
  raw: string;
};

type State = { literalTab: Node2[]; functionTab: Node2[] };
export type MutationConfig = { reroll: boolean; changeTransform: boolean };
const glslTransforms = [...generatorTransforms, ...modifierTransforms];
// type TransformType = keyof typeof glslTransforms;
class Mutator {
  private functionsPerCategory: {
    [index: string]: TransformDefinition[];
  };
  private transformationsMap: {
    [index: string]: typeof glslTransforms[];
  };
  private initialVector: (string | number)[];
  private literalsCount: number = 0;
  private functionsCount: number = 0;
  private lastLiteralValue: number | undefined = undefined;
  //   private editor;
  //   constructor(editor) {
  constructor() {
    // this.editor = editor;
    // this.undoStack = new UndoStack();

    this.initialVector = [];

    this.functionsPerCategory = {};
    this.transformationsMap = {};
    this.scanFuncs();
    // this.dumpDict();
    // const keys = Object.keys(this.transformationsMap);
    // console.log("keys: ", keys);
    // console.log("transformationsMap: ", this.transformationsMap);

    // const isArray1 = Array.isArray(glslTransforms);
    // console.log("glslTransforms: ", glslTransforms);
    // const isArray2 = Array.isArray();
    // console.log("isArray1: ", isArray1);
    // console.log("functionsPerCategory: ", this.functionsPerCategory);
    // const someCode = fs.readFileSync(
    //   "C:\\dev\\a\\hydra-code-generator\\src\\saved-hydra-generated-codes.js",
    //   "utf8"
    // );

    // console.log("someCode: ", someCode);
    // const codeArray = someCode.split("---");
    // console.log("codeArray: ", codeArray[0]);
  }
  scanFuncs() {
    let gslTab = glslTransforms;
    gslTab.forEach((f) => {
      //@ts-ignore
      this.transformationsMap[f.name] = f;
      if (this.functionsPerCategory[f.type] === undefined) {
        this.functionsPerCategory[f.type] = [];
      }
      this.functionsPerCategory[f.type].push(f);
    });
  }
  dumpDict() {
    for (let tn in this.functionsPerCategory) {
      this.functionsPerCategory[tn].forEach((f) => {
        var argList = "";
        f.inputs.forEach((a) => {
          if (argList != "") argList += ", ";
          let argL = a.name + ": " + a.type + " {" + a.default + "}";
          argList = argList + argL;
        });
        //console.log(f.name + " [" + f.type + "] ("+ argList + ")");
      });
    }
  }
  mutate(text: string, options: MutationConfig) {
    // Get text from CodeMirror.
    // let text = this.editor.cm.getValue();
    // let text = options.text;
    // this.undoStack.push({ text, lastLitX: this.lastLitX });
    let needToRun = true;
    let tryCounter = 5;
    let regeneratedCode: string | undefined;
    while (needToRun && tryCounter-- >= 0) {
      //   console.log("tryCounter: ", tryCounter);
      // Parse to AST
      var comments: Comment[] = [];
      let ast: Node = Parser.parse(text, {
        locations: true,
        onComment: comments,
        ecmaVersion: 2020, //a warning warned me about this
      });

      // Modify the AST.
      this.transform(ast, options);

      // Put the comments back.
      attachComments(ast, comments);

      // Generate JS from AST and set back into CodeMirror editor.
      let regen = generate(ast, { comments: true });
      regeneratedCode = regen;

      // this.editor.cm.setValue(regen);
      // console.log('regen: --', regen);
      /*
      try {
        // Evaluate the updated expression.
        repl.eval(regen, (code, error) => {
          // If we got an error, keep trying something else.
          if (error) {
            console.log("Eval error: " + regen);
          }
          needToRun = error;
        });
      } catch (err) {
        console.log("Exception caught: " + err);
        needToRun = err;
      }
      */
    }
    if (!regeneratedCode) return;
    const beautified = beautify.js(regeneratedCode, {
      indent_size: 2,
      break_chained_methods: true,
      indent_with_tabs: true,
    });
    // console.log("beautified: ", beautified);
    return beautified;
  }
  transform(ast: Node, options: MutationConfig) {
    // An AST traveler that accumulates a list of Literal nodes.
    let traveler = makeTraveler({
      go: function (node: Node2, state: State) {
        if (node.type === "Literal") {
          state.literalTab.push(node);
        } else if (node.type === "MemberExpression") {
          if (node.property && node.property.type === "Literal") {
            // numeric array subscripts are ineligable
            return;
          }
        } else if (node.type === "CallExpression") {
          if (
            node.callee &&
            node.callee.property &&
            node.callee.property.name &&
            node.callee.property.name !== "out"
          ) {
            state.functionTab.push(node);
          }
        }
        // Call the parent's `go` method
        this.super.go.call(this, node, state);
      },
    });

    let state: State = { literalTab: [], functionTab: [] };
    // state.literalTab = [];
    // state.functionTab = [];

    traveler.go(ast, state);

    this.literalsCount = state.literalTab.length;
    this.functionsCount = state.functionTab.length;
    if (this.literalsCount !== this.initialVector.length) {
      let nextVect = [];
      for (let i = 0; i < this.literalsCount; ++i) {
        nextVect.push(state.literalTab[i].value);
      }
      this.initialVector = nextVect;
    }
    if (options.changeTransform) {
      this.glitchTrans(state /*, options*/);
    } else this.glitchLiteral(state, options);
  }
  glitchLiteral(state: State, options: MutationConfig) {
    let litx = 0;
    if (options.reroll) {
      if (this.lastLiteralValue !== undefined) {
        litx = this.lastLiteralValue;
      }
    } else {
      litx = Math.floor(Math.random() * this.literalsCount);
      this.lastLiteralValue = litx;
    }

    let modLit = state.literalTab[litx];
    if (modLit) {
      // let glitched = this.glitchNumber(modLit.value);
      let glitched = this.glitchRelToInit(
        Number(modLit.value),
        Number(this.initialVector[litx])
      );
      //@ts-ignore
      let was = modLit.raw;
      modLit.value = glitched;
      modLit.raw = "" + glitched;
      //   console.log(        "Literal: " + litx + " changed from: " + was + " to: " + glitched      );
    }
  }

  glitchNumber(num: number) {
    if (num === 0) {
      num = 1;
    }
    let range = num * 2;
    let rndVal = Math.round(Math.random() * range * 1000) / 1000;
    return rndVal;
  }

  glitchRelToInit(num: number, initVal: number) {
    if (initVal === undefined) {
      return this.glitchNumber(num);
    }
    if (initVal === 0) {
      initVal = 0.5;
    }

    let rndVal = Math.round(Math.random() * initVal * 2 * 1000) / 1000;
    return rndVal;
  }
  glitchTrans(state: State /*, options:MutationConfig*/) {
    /*
		state.functionTab.forEach((f)=>{
			console.log(f.callee.property.name);
		});
*/
    let funx = Math.floor(Math.random() * this.functionsCount);
    if (
      state.functionTab[funx] === undefined ||
      state.functionTab[funx].callee === undefined ||
      state.functionTab[funx].callee.property === undefined
    ) {
      console.log("No valid functionTab for index: " + funx);
      return;
    }
    let oldName = state.functionTab[funx].callee.property.name;

    if (oldName == undefined) {
      console.log("No name for callee");
      return;
    }
    //@ts-ignore
    let ftype = this.transformationsMap[oldName].type;
    if (ftype == undefined) {
      console.log("ftype undefined for: " + oldName);
      return;
    }
    let others = this.functionsPerCategory[ftype];
    if (others == undefined) {
      console.log("no funcTab entry for: " + ftype);
      return;
    }
    let changeX = Math.floor(Math.random() * others.length);
    let become = others[changeX].name;

    // check blacklisted combinations.
    if (oldName === "modulate" && become === "modulateScrollX") {
      console.log(
        "Function: " +
          funx +
          " changing from: " +
          oldName +
          " can't change to: " +
          become
      );
      return;
    }

    state.functionTab[funx].callee.property.name = become;
    console.log(
      "Function: " + funx + " changed from: " + oldName + " to: " + become
    );
  }
}
export default Mutator;
