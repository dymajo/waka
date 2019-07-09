export default abstract class BaseKeyvalue {
  public name: string
  abstract get(key: string): Promise<any>
  abstract set(key: string, value: any): Promise<boolean>
  abstract scan(): Promise<any>
  abstract delete(key: string): Promise<any>
}