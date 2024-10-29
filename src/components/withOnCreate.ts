import { Comp } from "kaboom";

export type OnCreateComp = {
  isFirstTime: boolean;
  onCreate?: Function;
} & Comp;

export function withOnCreate(): OnCreateComp {
  return {
    id: "withOnCreate",
    isFirstTime: true,
    update() {
      if (this.isFirstTime && this.onCreate) {
        this.onCreate();
        this.isFirstTime = false;
      }
    },
  };
}
