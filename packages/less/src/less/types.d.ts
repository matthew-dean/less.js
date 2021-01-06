  // FileInfo = {
  //  'rewriteUrls' - option - whether to adjust URL's to be relative
  //  'filename' - full resolved filename of current file
  //  'rootpath' - path to append to normal URLs for this node
  //  'currentDirectory' - path to the current file, absolute
  //  'rootFilename' - filename of the base file
  //  'entryPath' - absolute path to the entry file
  //  'reference' - whether the file should not be output and only output parts that are referenced
export type IFileInfo = {
  filename?: string
  rewriteUrls?: number
  rootpath?: string
  currentDirectory?: string
  entryPath?: string
  rootFilename?: string
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