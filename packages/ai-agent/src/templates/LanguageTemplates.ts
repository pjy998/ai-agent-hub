/**
 * 语言特定的分析模板系统
 * 为不同编程语言提供预定义的分析配置模板
 */

export interface AnalysisRule {
  name: string;
  description: string;
  pattern?: string;
  severity: 'error' | 'warning' | 'info';
  category: 'naming' | 'structure' | 'security' | 'performance' | 'style' | 'best-practice';
  message: string;
  suggestion?: string;
}

export interface CodingStandard {
  name: string;
  description: string;
  rules: string[];
  examples: {
    good: string;
    bad: string;
    explanation: string;
  }[];
}

export interface SecurityCheck {
  name: string;
  description: string;
  riskLevel: 'high' | 'medium' | 'low';
  patterns: string[];
  mitigation: string;
}

export interface PerformanceCheck {
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  patterns: string[];
  optimization: string;
}

export interface LanguageTemplate {
  language: string;
  displayName: string;
  fileExtensions: string[];
  analysisRules: AnalysisRule[];
  codingStandards: CodingStandard[];
  securityChecks: SecurityCheck[];
  performanceChecks: PerformanceCheck[];
  frameworkSpecific?: {
    [framework: string]: {
      rules: AnalysisRule[];
      standards: CodingStandard[];
    };
  };
}

/**
 * 语言模板管理器
 */
export class LanguageTemplates {
  private static templates: Map<string, LanguageTemplate> = new Map();

  /**
   * 初始化所有语言模板
   */
  static initialize(): void {
    this.registerCSharpTemplate();
    this.registerJavaTemplate();
    this.registerPythonTemplate();
    this.registerJavaScriptTemplate();
    this.registerTypeScriptTemplate();
    this.registerVueTemplate();
    this.registerGoTemplate();
    this.registerRustTemplate();
  }

  /**
   * 获取语言模板
   */
  static getTemplate(language: string): LanguageTemplate | undefined {
    return this.templates.get(language.toLowerCase());
  }

  /**
   * 获取所有支持的语言
   */
  static getSupportedLanguages(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * 注册自定义模板
   */
  static registerTemplate(template: LanguageTemplate): void {
    this.templates.set(template.language.toLowerCase(), template);
  }

  /**
   * 注册C#模板
   */
  private static registerCSharpTemplate(): void {
    const template: LanguageTemplate = {
      language: 'csharp',
      displayName: 'C#',
      fileExtensions: ['.cs'],
      analysisRules: [
        {
          name: 'PascalCaseClasses',
          description: '类名应使用PascalCase命名',
          pattern: '^class\\s+[a-z]',
          severity: 'warning',
          category: 'naming',
          message: '类名应以大写字母开头',
          suggestion: '使用PascalCase命名约定，如：MyClass',
        },
        {
          name: 'CamelCaseFields',
          description: '私有字段应使用camelCase或_camelCase',
          pattern: 'private\\s+\\w+\\s+[A-Z]',
          severity: 'warning',
          category: 'naming',
          message: '私有字段应使用camelCase命名',
          suggestion: '使用_fieldName或fieldName格式',
        },
        {
          name: 'AsyncMethodNaming',
          description: '异步方法应以Async结尾',
          pattern: 'async\\s+\\w+.*(?<!Async)\\s*\\(',
          severity: 'warning',
          category: 'naming',
          message: '异步方法名应以Async结尾',
          suggestion: '在方法名后添加Async后缀',
        },
      ],
      codingStandards: [
        {
          name: 'Microsoft C# Coding Conventions',
          description: '遵循Microsoft官方C#编码约定',
          rules: [
            '使用PascalCase命名类、方法、属性',
            '使用camelCase命名局部变量和参数',
            '私有字段使用_camelCase',
            '常量使用PascalCase',
            '接口名以I开头',
          ],
          examples: [
            {
              good: 'public class CustomerService\n{\n    private readonly ILogger _logger;\n    public async Task<Customer> GetCustomerAsync(int id)\n    {\n        // implementation\n    }\n}',
              bad: 'public class customerservice\n{\n    private readonly ILogger Logger;\n    public Customer getCustomer(int ID)\n    {\n        // implementation\n    }\n}',
              explanation: '正确使用了PascalCase类名、_camelCase私有字段、异步方法命名',
            },
          ],
        },
      ],
      securityChecks: [
        {
          name: 'SQL Injection Prevention',
          description: '检查SQL注入漏洞',
          riskLevel: 'high',
          patterns: ['string.Format.*SELECT', 'string.Concat.*WHERE'],
          mitigation: '使用参数化查询或Entity Framework',
        },
        {
          name: 'XSS Prevention',
          description: '检查跨站脚本攻击漏洞',
          riskLevel: 'medium',
          patterns: ['Html.Raw', '@Html.Raw'],
          mitigation: '使用Html.Encode或Razor自动编码',
        },
      ],
      performanceChecks: [
        {
          name: 'String Concatenation',
          description: '检查字符串拼接性能问题',
          impact: 'medium',
          patterns: ['\\+.*\\+.*string', 'string.*\\+.*\\+'],
          optimization: '使用StringBuilder或string interpolation',
        },
        {
          name: 'LINQ Performance',
          description: '检查LINQ性能问题',
          impact: 'medium',
          patterns: ['.ToList\\(\\).Count', '.ToArray\\(\\).Length'],
          optimization: '直接使用.Count()或.Any()方法',
        },
      ],
    };
    this.templates.set('csharp', template);
  }

  /**
   * 注册Java模板
   */
  private static registerJavaTemplate(): void {
    const template: LanguageTemplate = {
      language: 'java',
      displayName: 'Java',
      fileExtensions: ['.java'],
      analysisRules: [
        {
          name: 'PascalCaseClasses',
          description: '类名应使用PascalCase命名',
          pattern: '^class\\s+[a-z]',
          severity: 'warning',
          category: 'naming',
          message: '类名应以大写字母开头',
          suggestion: '使用PascalCase命名约定',
        },
        {
          name: 'CamelCaseMethods',
          description: '方法名应使用camelCase命名',
          pattern: 'public\\s+\\w+\\s+[A-Z]\\w*\\(',
          severity: 'warning',
          category: 'naming',
          message: '方法名应使用camelCase',
          suggestion: '方法名首字母小写',
        },
        {
          name: 'ConstantNaming',
          description: '常量应使用UPPER_SNAKE_CASE',
          pattern: 'static\\s+final\\s+\\w+\\s+[a-z]',
          severity: 'warning',
          category: 'naming',
          message: '常量应使用大写字母和下划线',
          suggestion: '使用CONSTANT_NAME格式',
        },
      ],
      codingStandards: [
        {
          name: 'Oracle Java Code Conventions',
          description: '遵循Oracle Java编码规范',
          rules: [
            '类名使用PascalCase',
            '方法和变量使用camelCase',
            '常量使用UPPER_SNAKE_CASE',
            '包名使用小写字母',
            '每行代码不超过120字符',
          ],
          examples: [
            {
              good: 'public class UserService {\n    private static final int MAX_RETRY_COUNT = 3;\n    public User findUserById(Long userId) {\n        // implementation\n    }\n}',
              bad: 'public class userservice {\n    private static final int max_retry_count = 3;\n    public User FindUserById(Long UserID) {\n        // implementation\n    }\n}',
              explanation: '正确使用了Java命名约定和代码格式',
            },
          ],
        },
      ],
      securityChecks: [
        {
          name: 'SQL Injection Prevention',
          description: '检查SQL注入漏洞',
          riskLevel: 'high',
          patterns: ['Statement.execute.*\\+', 'createStatement.*\\+'],
          mitigation: '使用PreparedStatement参数化查询',
        },
        {
          name: 'Deserialization Vulnerability',
          description: '检查反序列化安全漏洞',
          riskLevel: 'high',
          patterns: ['ObjectInputStream', 'readObject'],
          mitigation: '验证反序列化数据来源和内容',
        },
      ],
      performanceChecks: [
        {
          name: 'String Concatenation',
          description: '检查字符串拼接性能',
          impact: 'medium',
          patterns: ['String.*\\+.*\\+', '\\+.*String.*\\+'],
          optimization: '使用StringBuilder或String.format()',
        },
        {
          name: 'Collection Performance',
          description: '检查集合使用性能',
          impact: 'medium',
          patterns: ['Vector', 'Hashtable'],
          optimization: '使用ArrayList和HashMap替代',
        },
      ],
      frameworkSpecific: {
        spring: {
          rules: [
            {
              name: 'SpringComponentNaming',
              description: 'Spring组件命名规范',
              severity: 'warning',
              category: 'naming',
              message: 'Spring组件应使用合适的命名',
              suggestion: 'Service类以Service结尾，Controller类以Controller结尾',
            },
          ],
          standards: [
            {
              name: 'Spring Best Practices',
              description: 'Spring框架最佳实践',
              rules: [
                '使用@Autowired进行依赖注入',
                '避免在Controller中直接访问数据库',
                '使用@Transactional管理事务',
              ],
              examples: [],
            },
          ],
        },
      },
    };
    this.templates.set('java', template);
  }

  /**
   * 注册Python模板
   */
  private static registerPythonTemplate(): void {
    const template: LanguageTemplate = {
      language: 'python',
      displayName: 'Python',
      fileExtensions: ['.py'],
      analysisRules: [
        {
          name: 'SnakeCaseFunctions',
          description: '函数名应使用snake_case命名',
          pattern: 'def\\s+[A-Z]',
          severity: 'warning',
          category: 'naming',
          message: '函数名应使用snake_case',
          suggestion: '使用小写字母和下划线',
        },
        {
          name: 'PascalCaseClasses',
          description: '类名应使用PascalCase命名',
          pattern: 'class\\s+[a-z]',
          severity: 'warning',
          category: 'naming',
          message: '类名应以大写字母开头',
          suggestion: '使用PascalCase命名约定',
        },
        {
          name: 'ConstantNaming',
          description: '常量应使用UPPER_SNAKE_CASE',
          pattern: '^[a-z].*=.*$',
          severity: 'info',
          category: 'naming',
          message: '模块级常量应使用大写字母',
          suggestion: '使用CONSTANT_NAME格式',
        },
      ],
      codingStandards: [
        {
          name: 'PEP 8 Style Guide',
          description: '遵循PEP 8 Python代码风格指南',
          rules: [
            '使用4个空格缩进',
            '每行不超过79字符',
            '函数和变量使用snake_case',
            '类名使用PascalCase',
            '常量使用UPPER_SNAKE_CASE',
          ],
          examples: [
            {
              good: 'class UserService:\n    MAX_RETRY_COUNT = 3\n    \n    def find_user_by_id(self, user_id):\n        """Find user by ID."""\n        pass',
              bad: 'class userservice:\n  maxRetryCount = 3\n  def FindUserById(self,userID):\n    pass',
              explanation: '正确使用了PEP 8命名约定和格式规范',
            },
          ],
        },
      ],
      securityChecks: [
        {
          name: 'SQL Injection Prevention',
          description: '检查SQL注入漏洞',
          riskLevel: 'high',
          patterns: ['execute.*%', 'execute.*format', 'execute.*\\+'],
          mitigation: '使用参数化查询或ORM',
        },
        {
          name: 'Code Injection',
          description: '检查代码注入漏洞',
          riskLevel: 'high',
          patterns: ['eval\\(', 'exec\\(', '__import__'],
          mitigation: '避免使用eval和exec，验证输入数据',
        },
      ],
      performanceChecks: [
        {
          name: 'List Comprehension',
          description: '建议使用列表推导式',
          impact: 'low',
          patterns: ['for.*in.*append'],
          optimization: '使用列表推导式提高性能',
        },
        {
          name: 'String Concatenation',
          description: '检查字符串拼接性能',
          impact: 'medium',
          patterns: ['\\+.*\\+.*str', 'str.*\\+.*\\+'],
          optimization: '使用join()或f-string格式化',
        },
      ],
    };
    this.templates.set('python', template);
  }

  /**
   * 注册JavaScript模板
   */
  private static registerJavaScriptTemplate(): void {
    const template: LanguageTemplate = {
      language: 'javascript',
      displayName: 'JavaScript',
      fileExtensions: ['.js', '.mjs'],
      analysisRules: [
        {
          name: 'CamelCaseVariables',
          description: '变量名应使用camelCase命名',
          pattern: 'var\\s+[A-Z]|let\\s+[A-Z]|const\\s+[A-Z]',
          severity: 'warning',
          category: 'naming',
          message: '变量名应使用camelCase',
          suggestion: '变量名首字母小写',
        },
        {
          name: 'PascalCaseConstructors',
          description: '构造函数应使用PascalCase命名',
          pattern: 'function\\s+[a-z].*new',
          severity: 'warning',
          category: 'naming',
          message: '构造函数名应以大写字母开头',
          suggestion: '使用PascalCase命名构造函数',
        },
        {
          name: 'ConstantNaming',
          description: '常量应使用UPPER_SNAKE_CASE',
          pattern: 'const\\s+[a-z].*=.*[A-Z]',
          severity: 'info',
          category: 'naming',
          message: '常量建议使用大写字母',
          suggestion: '使用CONSTANT_NAME格式',
        },
      ],
      codingStandards: [
        {
          name: 'Airbnb JavaScript Style Guide',
          description: '遵循Airbnb JavaScript代码风格',
          rules: [
            '使用const和let，避免var',
            '使用箭头函数',
            '使用模板字符串',
            '使用解构赋值',
            '使用严格相等(===)',
          ],
          examples: [
            {
              good: 'const getUserName = (user) => {\n  return `Hello, ${user.name}!`;\n};',
              bad: 'var getUserName = function(user) {\n  return "Hello, " + user.name + "!";\n};',
              explanation: '使用了const、箭头函数和模板字符串',
            },
          ],
        },
      ],
      securityChecks: [
        {
          name: 'XSS Prevention',
          description: '检查跨站脚本攻击漏洞',
          riskLevel: 'high',
          patterns: ['innerHTML.*\\+', 'document.write'],
          mitigation: '使用textContent或安全的DOM操作方法',
        },
        {
          name: 'Code Injection',
          description: '检查代码注入漏洞',
          riskLevel: 'high',
          patterns: ['eval\\(', 'Function\\(', 'setTimeout.*string'],
          mitigation: '避免使用eval和Function构造器',
        },
      ],
      performanceChecks: [
        {
          name: 'DOM Query Optimization',
          description: '优化DOM查询性能',
          impact: 'medium',
          patterns: ['getElementById.*getElementById', 'querySelector.*querySelector'],
          optimization: '缓存DOM查询结果',
        },
        {
          name: 'Array Method Performance',
          description: '数组方法性能优化',
          impact: 'low',
          patterns: ['for.*length', 'while.*length'],
          optimization: '缓存数组长度或使用for...of循环',
        },
      ],
    };
    this.templates.set('javascript', template);
  }

  /**
   * 注册TypeScript模板
   */
  private static registerTypeScriptTemplate(): void {
    const template: LanguageTemplate = {
      language: 'typescript',
      displayName: 'TypeScript',
      fileExtensions: ['.ts', '.tsx'],
      analysisRules: [
        {
          name: 'InterfaceNaming',
          description: '接口名应以I开头或使用描述性名称',
          pattern: 'interface\\s+[a-z]',
          severity: 'info',
          category: 'naming',
          message: '接口名建议使用PascalCase',
          suggestion: '使用描述性的接口名称',
        },
        {
          name: 'TypeAnnotations',
          description: '建议使用类型注解',
          pattern: 'function.*\\)\\s*{',
          severity: 'info',
          category: 'best-practice',
          message: '建议为函数添加返回类型注解',
          suggestion: '明确指定函数返回类型',
        },
        {
          name: 'EnumNaming',
          description: '枚举应使用PascalCase命名',
          pattern: 'enum\\s+[a-z]',
          severity: 'warning',
          category: 'naming',
          message: '枚举名应使用PascalCase',
          suggestion: '枚举名首字母大写',
        },
      ],
      codingStandards: [
        {
          name: 'TypeScript Best Practices',
          description: 'TypeScript最佳实践',
          rules: [
            '使用严格的类型检查',
            '避免使用any类型',
            '使用接口定义对象结构',
            '使用枚举代替魔法数字',
            '使用泛型提高代码复用性',
          ],
          examples: [
            {
              good: 'interface User {\n  id: number;\n  name: string;\n}\n\nfunction getUser(id: number): Promise<User> {\n  // implementation\n}',
              bad: 'function getUser(id: any): any {\n  // implementation\n}',
              explanation: '使用了接口定义和明确的类型注解',
            },
          ],
        },
      ],
      securityChecks: [
        {
          name: 'Type Safety',
          description: '检查类型安全问题',
          riskLevel: 'medium',
          patterns: ['any', 'as any', '@ts-ignore'],
          mitigation: '使用具体类型替代any，避免类型断言',
        },
        {
          name: 'XSS Prevention',
          description: '检查跨站脚本攻击漏洞',
          riskLevel: 'high',
          patterns: ['innerHTML.*\\+', 'dangerouslySetInnerHTML'],
          mitigation: '使用安全的DOM操作方法',
        },
      ],
      performanceChecks: [
        {
          name: 'Bundle Size Optimization',
          description: '优化打包体积',
          impact: 'medium',
          patterns: ['import \\*', 'require\\(.*\\)'],
          optimization: '使用按需导入减少打包体积',
        },
        {
          name: 'Type Compilation',
          description: '类型编译优化',
          impact: 'low',
          patterns: ['complex.*type.*union', 'deep.*nested.*type'],
          optimization: '简化复杂类型定义',
        },
      ],
    };
    this.templates.set('typescript', template);
  }

  /**
   * 注册Vue模板
   */
  private static registerVueTemplate(): void {
    const template: LanguageTemplate = {
      language: 'vue',
      displayName: 'Vue.js',
      fileExtensions: ['.vue'],
      analysisRules: [
        {
          name: 'ComponentNaming',
          description: 'Vue组件名应使用PascalCase',
          pattern: 'name:\\s*["\'][a-z]',
          severity: 'warning',
          category: 'naming',
          message: '组件名应使用PascalCase',
          suggestion: '使用PascalCase命名组件',
        },
        {
          name: 'PropValidation',
          description: 'Props应包含类型验证',
          pattern: 'props:\\s*\\[',
          severity: 'warning',
          category: 'best-practice',
          message: 'Props应使用对象形式并包含类型验证',
          suggestion: '使用对象定义props并指定类型',
        },
        {
          name: 'EventNaming',
          description: '自定义事件应使用kebab-case',
          pattern: '\\$emit\\(["\'][A-Z]',
          severity: 'warning',
          category: 'naming',
          message: '事件名应使用kebab-case',
          suggestion: '使用小写字母和连字符',
        },
      ],
      codingStandards: [
        {
          name: 'Vue.js Style Guide',
          description: '遵循Vue.js官方风格指南',
          rules: [
            '组件名使用PascalCase',
            'Props使用camelCase',
            '事件名使用kebab-case',
            '使用单文件组件',
            '模板中使用kebab-case',
          ],
          examples: [
            {
              good: '<template>\n  <user-profile :user-data="userData" @user-updated="handleUpdate" />\n</template>\n\n<script>\nexport default {\n  name: "UserProfile",\n  props: {\n    userData: {\n      type: Object,\n      required: true\n    }\n  }\n}\n</script>',
              bad: '<template>\n  <UserProfile :userData="userData" @userUpdated="handleUpdate" />\n</template>\n\n<script>\nexport default {\n  name: "userProfile",\n  props: ["userData"]\n}\n</script>',
              explanation: '正确使用了Vue.js命名约定和props验证',
            },
          ],
        },
      ],
      securityChecks: [
        {
          name: 'XSS Prevention',
          description: '检查跨站脚本攻击漏洞',
          riskLevel: 'high',
          patterns: ['v-html.*\\+', 'innerHTML'],
          mitigation: '避免使用v-html绑定用户输入，使用文本插值',
        },
        {
          name: 'Template Injection',
          description: '检查模板注入漏洞',
          riskLevel: 'medium',
          patterns: ['{{.*\\+.*}}', 'v-bind.*\\+'],
          mitigation: '验证和清理用户输入数据',
        },
      ],
      performanceChecks: [
        {
          name: 'Component Optimization',
          description: '组件性能优化',
          impact: 'medium',
          patterns: ['watch.*deep', 'computed.*function'],
          optimization: '使用浅层监听和箭头函数优化性能',
        },
        {
          name: 'Bundle Optimization',
          description: '打包优化',
          impact: 'medium',
          patterns: ['import.*vue.*full', 'Vue.use'],
          optimization: '使用按需导入和tree-shaking',
        },
      ],
    };
    this.templates.set('vue', template);
  }

  /**
   * 注册Go模板
   */
  private static registerGoTemplate(): void {
    const template: LanguageTemplate = {
      language: 'go',
      displayName: 'Go',
      fileExtensions: ['.go'],
      analysisRules: [
        {
          name: 'PackageNaming',
          description: '包名应使用小写字母',
          pattern: 'package\\s+[A-Z]',
          severity: 'warning',
          category: 'naming',
          message: '包名应使用小写字母',
          suggestion: '使用简短的小写包名',
        },
        {
          name: 'ExportedFunctions',
          description: '导出函数应以大写字母开头',
          pattern: 'func\\s+[a-z].*\\{',
          severity: 'info',
          category: 'naming',
          message: '导出函数名应以大写字母开头',
          suggestion: '公开函数使用PascalCase',
        },
        {
          name: 'ErrorHandling',
          description: '应正确处理错误',
          pattern: 'err\\s*:=.*\\n\\s*[^if]',
          severity: 'warning',
          category: 'best-practice',
          message: '应检查和处理错误',
          suggestion: '使用if err != nil检查错误',
        },
      ],
      codingStandards: [
        {
          name: 'Effective Go',
          description: '遵循Effective Go编程指南',
          rules: [
            '使用gofmt格式化代码',
            '包名使用小写字母',
            '导出标识符使用PascalCase',
            '私有标识符使用camelCase',
            '正确处理错误',
          ],
          examples: [
            {
              good: 'package main\n\nfunc GetUser(id int) (*User, error) {\n    user, err := findUser(id)\n    if err != nil {\n        return nil, err\n    }\n    return user, nil\n}',
              bad: 'package Main\n\nfunc getUser(ID int) *User {\n    user, _ := findUser(ID)\n    return user\n}',
              explanation: '正确使用了Go命名约定和错误处理',
            },
          ],
        },
      ],
      securityChecks: [
        {
          name: 'SQL Injection Prevention',
          description: '检查SQL注入漏洞',
          riskLevel: 'high',
          patterns: ['Exec.*\\+', 'Query.*fmt.Sprintf'],
          mitigation: '使用参数化查询',
        },
        {
          name: 'Path Traversal',
          description: '检查路径遍历漏洞',
          riskLevel: 'medium',
          patterns: ['filepath.Join.*\\.\\.\\.', 'os.Open.*\\.\\.\\.'],
          mitigation: '验证和清理文件路径',
        },
      ],
      performanceChecks: [
        {
          name: 'Goroutine Leaks',
          description: '检查goroutine泄漏',
          impact: 'high',
          patterns: ['go func.*{.*}\\(\\)', 'go\\s+\\w+\\('],
          optimization: '确保goroutine正确退出',
        },
        {
          name: 'Memory Allocation',
          description: '内存分配优化',
          impact: 'medium',
          patterns: ['make\\(\\[\\].*,\\s*0\\)', 'append.*make'],
          optimization: '预分配切片容量',
        },
      ],
    };
    this.templates.set('go', template);
  }

  /**
   * 注册Rust模板
   */
  private static registerRustTemplate(): void {
    const template: LanguageTemplate = {
      language: 'rust',
      displayName: 'Rust',
      fileExtensions: ['.rs'],
      analysisRules: [
        {
          name: 'SnakeCaseNaming',
          description: '函数和变量应使用snake_case',
          pattern: 'fn\\s+[A-Z]|let\\s+[A-Z]',
          severity: 'warning',
          category: 'naming',
          message: '函数和变量名应使用snake_case',
          suggestion: '使用小写字母和下划线',
        },
        {
          name: 'PascalCaseTypes',
          description: '类型名应使用PascalCase',
          pattern: 'struct\\s+[a-z]|enum\\s+[a-z]',
          severity: 'warning',
          category: 'naming',
          message: '类型名应使用PascalCase',
          suggestion: '结构体和枚举名首字母大写',
        },
        {
          name: 'UnwrapUsage',
          description: '避免过度使用unwrap()',
          pattern: '\\.unwrap\\(\\)',
          severity: 'warning',
          category: 'best-practice',
          message: '考虑使用更安全的错误处理',
          suggestion: '使用match、if let或?操作符',
        },
      ],
      codingStandards: [
        {
          name: 'Rust API Guidelines',
          description: '遵循Rust API设计指南',
          rules: [
            '使用snake_case命名函数和变量',
            '使用PascalCase命名类型',
            '使用SCREAMING_SNAKE_CASE命名常量',
            '正确处理错误和Option',
            '使用借用检查器避免内存问题',
          ],
          examples: [
            {
              good: 'struct User {\n    user_name: String,\n}\n\nfn get_user_by_id(id: u32) -> Result<User, Error> {\n    // implementation\n}',
              bad: 'struct user {\n    UserName: String,\n}\n\nfn GetUserByID(ID: u32) -> User {\n    // implementation\n}',
              explanation: '正确使用了Rust命名约定和错误处理',
            },
          ],
        },
      ],
      securityChecks: [
        {
          name: 'Memory Safety',
          description: '检查内存安全问题',
          riskLevel: 'high',
          patterns: ['unsafe\\s*{', 'transmute', 'from_raw'],
          mitigation: '避免使用unsafe代码，使用安全的替代方案',
        },
        {
          name: 'Integer Overflow',
          description: '检查整数溢出',
          riskLevel: 'medium',
          patterns: ['wrapping_add', 'unchecked_add'],
          mitigation: '使用checked_*方法进行安全的数学运算',
        },
      ],
      performanceChecks: [
        {
          name: 'Clone Optimization',
          description: '优化clone使用',
          impact: 'medium',
          patterns: ['\\.clone\\(\\).*\\.clone\\(\\)', 'clone.*loop'],
          optimization: '使用借用或引用避免不必要的clone',
        },
        {
          name: 'Collection Performance',
          description: '集合性能优化',
          impact: 'medium',
          patterns: ['Vec::new\\(\\).*push', 'HashMap::new\\(\\).*insert'],
          optimization: '使用with_capacity预分配容量',
        },
      ],
    };
    this.templates.set('rust', template);
  }
}

// 初始化所有模板
LanguageTemplates.initialize();
