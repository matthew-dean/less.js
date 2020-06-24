import {
  FileManager,
  FileParser,
  IOptions,
  IImportOptions,
  Environment,
  FileObject,
  Node
} from '@less/core'

class LessFileManager extends FileManager implements FileParser {
  supports(
    filePath: string,
    currentDirectory: string,
    options: IOptions & IImportOptions,
    environment: Environment
  ) {
    return /\.less$/.test(filePath) || options.less
  }

  parseFile(file: FileObject, options: IOptions & IImportOptions): Node {

  }
}

export default FileManager;