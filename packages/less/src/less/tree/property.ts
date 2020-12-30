import Node, { IFileInfo, isNodeArgs, NodeArgs } from './node';
import Declaration from './declaration';
import Variable from './variable';
import { mergeRules } from './util/merge';

type V1Args = [
    name: string,
    index: number,
    currentFileInfo: IFileInfo
]
/**
 * A property reference e.g. $prop
 * 
 * @todo - merge with variable node?
 */
class Property extends Variable {
    type: 'Property'

    eval(context) {
        let property;
        const name = this.nodes;

        if (this.evaluating) {
            throw { type: 'Name',
                message: `Recursive property reference for ${name}`,
                filename: this.fileInfo().filename,
                index: this.getIndex() };
        }

        this.evaluating = true;

        property = this.find(context.frames, function (frame) {
            let v;
            const vArr = frame.property(name);
            if (vArr) {
                for (let i = 0; i < vArr.length; i++) {
                    v = vArr[i];

                    vArr[i] = new Declaration(v.name,
                        v.value,
                        v.important,
                        v.merge,
                        v.index,
                        v.currentFileInfo,
                        v.inline,
                        v.variable
                    );
                }
                mergeRules(vArr);

                v = vArr[vArr.length - 1];
                if (v.important) {
                    const importantScope = context.importantScope[context.importantScope.length - 1];
                    importantScope.important = v.important;
                }
                v = v.value.eval(context);
                return v;
            }
        });
        if (property) {
            this.evaluating = false;
            return property;
        } else {
            throw { type: 'Name',
                message: `Property '${name}' is undefined`,
                filename: this._fileInfo.filename,
                index: this._index
            };
        }
    }
}

Property.prototype.type = 'Property'

export default Property;
