import Mutator from "./Mutator";
import EventEmitter from "eventemitter3";

class CodeMutatorExplorer extends EventEmitter {
  private text: string;
  private mutator: Mutator;
  private isRerrollCheck: HTMLInputElement;
  private isChangeTransformCheck: HTMLInputElement;
  constructor(text: string, mutator: Mutator) {
    super();
    this.mutator = mutator;
    // console.log("text: ", text);
    // console.log("pre: ", pre);
    const divElemenent = document.createElement("div");
    this.isRerrollCheck = document.createElement("input");
    this.isRerrollCheck.type = "checkbox";
    divElemenent.appendChild(this.isRerrollCheck);
    this.isChangeTransformCheck = document.createElement("input");
    this.isChangeTransformCheck.type = "checkbox";
    divElemenent.appendChild(this.isChangeTransformCheck);
    const pre = document.createElement("pre");
    pre.classList.add("original-code");
    pre.innerHTML = text;
    pre.addEventListener("click", this.mutate.bind(this));
    this.text = text;
    const codeElement = document.body.querySelector("#code")!;
    codeElement.appendChild(divElemenent);
    divElemenent.appendChild(pre);
  }
  mutate() {
    // console.clear();
    const isReroll = this.isRerrollCheck.checked;
    const isChangeTransform = this.isChangeTransformCheck.checked;
    // console.log("isReroll: ", isReroll);
    // console.log("this: ", this.text);
    const options = {
      reroll: isReroll,
      changeTransform: isChangeTransform,
      attempts: 1,
    };
    try {
      const mutated = this.mutator.mutate(this.text, options);
      this.emit("mutated", { original: this.text, mutated });
    } catch (e) {
      console.log("e: ", e);
    }
    // value = this.text;
    // orig2 = mutated;
    // initUI();
  }
}
export default CodeMutatorExplorer;
