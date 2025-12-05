export interface Command<T = void> {
  execute(): Promise<T>;
}

export interface ClicksResult {
  clicks: number;
  buffered: number;
}

export type AddClicksFn = (count: number) => Promise<ClicksResult | null>;

export class AddClicksCommand implements Command<ClicksResult | null> {
  constructor(
    private readonly addClicks: AddClicksFn,
    private readonly count: number
  ) {}

  async execute(): Promise<ClicksResult | null> {
    return this.addClicks(this.count);
  }

  getCount(): number {
    return this.count;
  }
}
