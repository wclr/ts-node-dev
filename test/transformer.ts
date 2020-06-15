import * as ts from 'typescript'
export default function (program: ts.Program, pluginOptions: {}) {
  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function visitor(node: ts.Node): ts.Node {        
        if (ts.isStringLiteral(node)) {
          return ts.createLiteral('transformed');
        }
        return ts.visitEachChild(node, visitor, ctx)
      }
      return ts.visitEachChild(sourceFile, visitor, ctx)
    }
  }
}
