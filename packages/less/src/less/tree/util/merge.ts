import Expression from '../expression';
import List from '../list';

export const mergeRules = function(rules) {
    if (!rules) {
        return; 
    }

    const groups    = {};
    const groupsArr = [];

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (rule.merge) {
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
                if ((rule.merge === '+') && (space.length > 0)) {
                    comma.push(new Expression(space = []));
                }
                space.push(rule.value);
                result.important = result.important || rule.important;
            });
            result.value = new List(comma);
        }
    });
};