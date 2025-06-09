export abstract class BaseModel {
  constructor() {}
  public async generateImage(
    prompt: string,
    tensorPath: string,
    numOfImages: number
  ): Promise<any> {}
  public async trainModel(zipUrl: string, triggerWord: string): Promise<any> {}
}
