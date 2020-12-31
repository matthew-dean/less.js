export type IFileInfo = {
  filename: string
  rewriteUrls: number
  rootpath: string
  currentDirectory: string
  entryPath: string
  rootFilename: string
  reference?: boolean
}

export type OutputCollector = {
  add: (
      chunk: string,
      fileInfo?: IFileInfo,
      index?: number,
      /** Used in source map collector */
      mapLines?: boolean
  ) => void
  isEmpty: () => boolean
}