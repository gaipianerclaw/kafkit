// 高级搜索语法解析器

export interface SearchQuery {
  raw: string;
  terms: SearchTerm[];
  filters: SearchFilter[];
}

interface SearchTerm {
  value: string;
  negated: boolean;
  exact: boolean;
}

interface SearchFilter {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex';
  value: string;
  negated: boolean;
}

// 解析搜索查询
export function parseSearchQuery(query: string): SearchQuery {
  const terms: SearchTerm[] = [];
  const filters: SearchFilter[] = [];
  
  // 正则匹配:
  // 1. 过滤器: field:operator:value 或 field:value
  // 2. 排除项: -value
  // 3. 精确匹配: "value"
  // 4. 普通词: value
  
  const filterRegex = /(\w+):(?:(eq|gt|lt|gte|lte|contains|regex|>|<|>=|<=):)?([^\s]+)/g;
  const exactRegex = /"([^"]*)"/g;
  const negatedRegex = /-(\w+)/g;
  
  let remaining = query;
  
  // 提取过滤器
  let match;
  while ((match = filterRegex.exec(query)) !== null) {
    const [, field, operator, value] = match;
    filters.push({
      field: field.toLowerCase(),
      operator: parseOperator(operator || 'eq'),
      value: unescapeValue(value),
      negated: false,
    });
    remaining = remaining.replace(match[0], '');
  }
  
  // 提取精确匹配
  while ((match = exactRegex.exec(query)) !== null) {
    terms.push({
      value: match[1],
      negated: false,
      exact: true,
    });
    remaining = remaining.replace(`"${match[1]}"`, '');
  }
  
  // 提取排除项
  while ((match = negatedRegex.exec(query)) !== null) {
    terms.push({
      value: match[1],
      negated: true,
      exact: false,
    });
    remaining = remaining.replace(`-${match[1]}`, '');
  }
  
  // 剩余的是普通词
  const words = remaining.trim().split(/\s+/).filter(w => w.length > 0);
  for (const word of words) {
    if (!terms.some(t => t.value === word)) {
      terms.push({
        value: word,
        negated: false,
        exact: false,
      });
    }
  }
  
  return { raw: query, terms, filters };
}

function parseOperator(op: string): SearchFilter['operator'] {
  switch (op) {
    case '>': return 'gt';
    case '<': return 'lt';
    case '>=': return 'gte';
    case '<=': return 'lte';
    case '~': return 'contains';
    case '/': return 'regex';
    default: return op as SearchFilter['operator'] || 'eq';
  }
}

function unescapeValue(value: string): string {
  return value.replace(/^["']|["']$/g, '');
}

// 应用搜索到消息
export function matchSearch<T extends Record<string, unknown>>(
  item: T,
  query: SearchQuery,
  searchableFields: string[]
): boolean {
  // 检查过滤器
  for (const filter of query.filters) {
    if (!matchFilter(item, filter)) {
      return false;
    }
  }
  
  // 检查搜索词
  if (query.terms.length > 0) {
    const searchableText = searchableFields
      .map(f => String(item[f] ?? ''))
      .join(' ')
      .toLowerCase();
    
    for (const term of query.terms) {
      const matched = term.exact
        ? searchableText.includes(term.value.toLowerCase())
        : searchableText.includes(term.value.toLowerCase());
      
      if (term.negated && matched) return false;
      if (!term.negated && !matched) return false;
    }
  }
  
  return true;
}

function matchFilter<T extends Record<string, unknown>>(
  item: T,
  filter: SearchFilter
): boolean {
  const value = item[filter.field];
  if (value === undefined) return filter.negated;
  
  const strValue = String(value).toLowerCase();
  const filterValue = filter.value.toLowerCase();
  
  let result: boolean;
  
  switch (filter.operator) {
    case 'eq':
      result = strValue === filterValue;
      break;
    case 'contains':
      result = strValue.includes(filterValue);
      break;
    case 'gt':
      result = Number(value) > Number(filter.value);
      break;
    case 'lt':
      result = Number(value) < Number(filter.value);
      break;
    case 'gte':
      result = Number(value) >= Number(filter.value);
      break;
    case 'lte':
      result = Number(value) <= Number(filter.value);
      break;
    case 'regex':
      try {
        const regex = new RegExp(filter.value, 'i');
        result = regex.test(String(value));
      } catch {
        result = false;
      }
      break;
    default:
      result = strValue.includes(filterValue);
  }
  
  return filter.negated ? !result : result;
}

// 搜索语法帮助
export const searchSyntaxHelp = `
搜索语法:
─────────────────────────────────
普通搜索:        keyword
精确匹配:        "exact phrase"
排除搜索:        -exclude
字段过滤:        field:value
比较操作:        offset:>1000
                timestamp:gte:2024-01-01
正则匹配:        value:/pattern/

示例:
  topic:order status:success
  partition:0 offset:>1000000
  -error "payment failed"
─────────────────────────────────
`;

// 验证搜索查询
export function validateSearchQuery(query: string): { valid: boolean; error?: string } {
  try {
    const parsed = parseSearchQuery(query);
    
    // 检查正则表达式是否有效
    for (const filter of parsed.filters) {
      if (filter.operator === 'regex') {
        try {
          new RegExp(filter.value);
        } catch (e) {
          return { valid: false, error: `Invalid regex: ${filter.value}` };
        }
      }
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: String(e) };
  }
}
