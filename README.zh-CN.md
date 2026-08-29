# dsh-forge

[![npm](https://img.shields.io/npm/v/@dshforge/cli?style=flat-square)](https://www.npmjs.com/package/@dshforge/cli)
[![npm](https://img.shields.io/npm/v/@dshforge/create?label=%40dshforge%2Fcreate&style=flat-square)](https://www.npmjs.com/package/@dshforge/create)
[![CI](https://img.shields.io/github/actions/workflow/status/0718lol/dsh-forge/ci.yml?style=flat-square)](https://github.com/0718lol/dsh-forge/actions)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)

**DeepSeek Harness（DSH）插件开发者工具链。** 一条命令创建插件，对着所有已发布的 `dsh-tools` 版本跑测试，放心发布。

> English documentation: [README.md](./README.md)

```sh
npm create @dshforge my-plugin
```

## 为什么做这个

DSH 目前处于 developer preview——官方 README 明写：**会有破坏性变更（THERE WILL BE COMPATIBILITY-BREAKING CHANGES）**。官方甚至专门维护了一篇[《防御性模式》](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/defensive-patterns.zh.md)，通篇是"本项目实际发布或差点发布的缺陷类别"。

每个插件作者都在重复手写同一套护栏。dsh-forge 把它们内置了：

| | 没有 dsh-forge | 用 dsh-forge |
|---|---|---|
| 开始写插件 | 读完 7 章教程，手搭 tsconfig 和测试 | `npm create @dshforge`，一条命令 |
| 上游破坏性变更 | 你的用户在生产环境里替你发现 | `npm run compat`——发布前跑遍所有已发布版本 |
| 插件规范 | 靠自觉 | `dsh-forge check`——结构坑点自动检查 |
| 发布 | 听天由命 | `dsh-forge publish`——check → build → test → publish |

## 快速开始

```sh
npm create @dshforge my-plugin
cd my-plugin
npm run dev        # watch 模式构建
npm test           # 单元测试——不需要跑着 harness
npx @deepseek-ai/dsh web --patch ./cordis.yml   # 挂到 harness 上
```

然后对 agent 说："Use the greet tool to greet Ada." 你的第一个插件就上线了。

## 兼容性测试（真正救命的部分）

```sh
npm run compat -- --list               # 列出所有已发布的 @deepseek-ai/dsh-tools 版本
npm run compat -- --against 0.1.0-rc.8 # 钉住某个版本跑测试
npm run compat                         # 默认矩阵：next + 最近 3 个版本
```

`compat` 会把每个版本钉进 `devDependencies`，跑完你的全部测试，然后**自动还原 package.json 和 lockfile**。配合自带的 [CI workflow](./.github/workflows/ci.yml)，上游破坏性变更会变成你 PR 里的一张红叉——而不是陌生人提的 bug。

## 静态检查

`dsh-forge check` 检查那些"让插件加载失败"或"带病上线"的结构性问题：

- 缺少 `export const name` / `apply` / `inject: ['tools']`
- 工具缺少 `description`、`parameters` 或规范 `output.schema`
- `async execute()` 从未引用 `exec.signal`（工作不可取消）
- `presentCall` / `presentResult` 不纯（用了时钟 / 随机数，回放会坏）
- 打包规范：`dsh-plugin` 关键字、peerDependencies、`files` 里的 `cordis.yml`

## 示例插件

[`examples/dsh-plugin-pet`](./examples/dsh-plugin-pet)——一只住在你 harness 里的陪伴小鲸鱼。喂食、玩耍、看 `presentResult` UI 卡片实战：

```
$ pet_status
　　　__________
　　/　　　　　　\
〈　^ㅅ^　　　　〉
　　\＿＿＿＿＿／
energy 80/100
```

## 生态

- [`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)——插件精选列表，发布后记得提交收录
- 官方文档：[deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) · [工具编写参考](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-tool.zh.md)

## License

MIT © 2026 dsh-forge contributors
