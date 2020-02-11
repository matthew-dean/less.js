import functionRegistry from '../functions/function-registry'
import LessError from '../less-error'

class AbstractPluginLoader {
  constructor() {
    // Implemented by Node.js plugin loader
    this.require = () => null
  }

  evalPlugin(contents, context, imports, pluginOptions, fileInfo) {
    let loader
    let registry
    let pluginObj
    let localModule
    let pluginManager
    let filename
    let result

    pluginManager = context.pluginManager

    if (fileInfo) {
      if (typeof fileInfo === 'string') {
        filename = fileInfo
      } else {
        filename = fileInfo.filename
      }
      if (pluginObj) {
        result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions)
        if (result) {
    if (filename) {
      pluginObj = pluginManager.get(filename)

      if (pluginObj) {
        result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions)
        if (result) {
          return result
        }
        try {
          if (pluginObj.use) {
            pluginObj.use.call(this.context, pluginObj)
          }
        } catch (e) {
          e.message = e.message || 'Error during @plugin call'
          return new LessError(e, imports, filename)
        }
        return pluginObj
      }
    }
    localModule = {
      exports: {},
      pluginManager,
      fileInfo
    }
    registry = functionRegistry.create()

    const registerPlugin = obj => {
      pluginObj = obj
    }

    try {
      loader = new Function(
        'module',
        'require',
        'registerPlugin',
        'functions',
        'tree',
        'less',
        'fileInfo',
        contents
      )
      loader(
        localModule,
        this.require(filename),
        registerPlugin,
        registry,
        this.less.tree,
        this.less,
        fileInfo
      )
    } catch (e) {
      return new LessError(e, imports, filename)
    }

    if (!pluginObj) {
      pluginObj = localModule.exports
    }
    pluginObj = this.validatePlugin(pluginObj, filename, shortname)

    if (pluginObj instanceof LessError) {
      return pluginObj
    }

    if (pluginObj) {
      pluginObj.imports = imports
      pluginObj.filename = filename

      // For < 3.x (or unspecified minVersion) - setOptions() before install()
      if (!pluginObj.minVersion || this.compareVersion('3.0.0', pluginObj.minVersion) < 0) {
        result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions)

        if (result) {
          return result
        }
      }

      // Run on first load
      pluginManager.addPlugin(pluginObj, fileInfo.filename, registry)
      pluginObj.functions = registry.getLocalFunctions()

      // Need to call setOptions again because the pluginObj might have functions
      result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions)
      if (result) {
        return result
      }

      // Run every @plugin call
      try {
        if (pluginObj.use) {
          pluginObj.use.call(this.context, pluginObj)
        }
      } catch (e) {
        e.message = e.message || 'Error during @plugin call'
        return new LessError(e, imports, filename)
      }
    } else {
      return new LessError({ message: 'Not a valid plugin' }, imports, filename)
    }

    return pluginObj
  }

  trySetOptions(plugin, filename, name, options) {
    if (options && !plugin.setOptions) {
      return new LessError({
        message: `Options have been provided but the plugin ${name} does not support any options.`
      })
    }
    try {
      plugin.setOptions && plugin.setOptions(options)
    } catch (e) {
      return new LessError(e)
  compareVersion(aVersion, bVersion) {
    if (typeof aVersion === 'string') {
      aVersion = aVersion.match(/^(\d+)\.?(\d+)?\.?(\d+)?/)
      aVersion.shift()
  versionToString(version) {
    let versionString = ''
    for (let i = 0; i < version.length; i++) {
      versionString += (versionString ? '.' : '') + version[i]
