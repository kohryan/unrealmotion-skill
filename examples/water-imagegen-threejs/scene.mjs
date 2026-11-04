import {createExplainerStage} from './runtime/explainer3d.mjs';
import {createModel} from './model.mjs';
export async function createScene(config){
  const stage=await createExplainerStage(config);
  const model=await createModel(stage,config);
  return {update(seconds,u){const state=stage.updateStory(seconds,u);model.update(seconds,u,state);},draw:stage.draw,inspect(){return {...stage.inspect(),...model.inspect()};}};
}
