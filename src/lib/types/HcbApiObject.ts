export default interface HcbApiObject<T extends string> {
  id: `${T}_${string}`;
  created_at: string;
}
