import {
    Expression,
    List,
    Node,
    Declaration
} from '../';

export const mergeRules = function(rules: Declaration[]) {
    if (!rules) {
        return; 
    }
    const groups: Record<string, Declaration[]>    = {};
    const groupsArr: Declaration[][]               = [];

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (rule.options.merge) {
            const key = rule.name;
            groups[key] ? rules.splice(i--, 1) : 
                groupsArr.push(groups[key] = []);
            groups[key].push(rule);
        }
    }

    groupsArr.forEach(group => {
        if (group.length > 0) {
            const result = group[0];
            let space  = [];
            const comma  = [new Expression(space)];
            group.forEach(rule => {
                if ((rule.options.merge === '+') && (space.length > 0)) {
                    comma.push(new Expression(space = []));
                }
                space.push(rule.value);
                result.important = result.important || rule.important;
            });
            result.value = new List(comma);
        }
    });
};