import HcbApiObject from "./HcbApiObject";

export type TagColor =
  | "muted"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple";

export default interface Tag extends HcbApiObject<"tag"> {
  label: string;
  color: TagColor;
  emoji?: string | null;
}
