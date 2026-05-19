# Minecraft Plugin Marketplace - CLI 詳細設計書 v0.1

## 1. 目的

本書は Minecraft Plugin Marketplace の CLI 部分について、
**コマンド仕様・引数仕様・内部処理・出力方針・エラー方針** を明確化するための詳細設計書である。

CLI は本プロジェクトにおける最重要要素であり、MVP 段階でも最も価値を提供する部分である。

---

## 2. CLI の基本方針

### 2-1. 設計思想
- コア価値は WebUI ではなく CLI にある
- Minecraft サーバー管理者が「手作業のブラウザ操作」から脱却できることを目指す
- コマンドは短く、直感的で、覚えやすくする
- npm / pnpm / docker / git などの開発者向け CLI 体験を参考にする
- 人間が読みやすい出力を優先する

### 2-2. コマンド名
CLI コマンドの仮名称は `hopper(エイリアス:h,ho,hop,hr)` とする。

例:

```bash
hopper search economy
hopper install essentialsx
hopper update
```

正式名称は将来的に変更可能とするが、設計上は `hopper` を前提とする。

---

## 3. 対象ユーザー像

- Minecraft サーバー運営者
- Paper / Spigot 系プラグインを多数運用する人
- CLI に抵抗のないエンジニア
- 再現可能なプラグイン環境を求めるユーザー

---

## 4. 実行前提

### 4-1. 実行環境
- Node.js LTS
- TypeScript により実装された Node CLI
- 対応 OS: macOS / Windows / Linux

### 4-2. 作業対象ディレクトリ
CLI は原則として「現在の作業ディレクトリ」を対象とする。

想定:
- サーバールートで実行する
- その下に `plugins/` ディレクトリが存在する
- または `--plugins-dir` オプションで明示指定する

---

## 5. サブコマンド一覧

MVP で対象とするコマンドは以下。

1. `hopper search <query>`
2. `hopper info <plugin-name>`
3. `hopper install [plugin-name]`
4. `hopper list`
5. `hopper remove <plugin-name>`
6. `hopper update [plugin-name]`
7. `hopper init`
8. `hopper doctor`

将来拡張:
- `hopper outdated`
- `hopper add`
- `hopper why`
- `hopper audit`
- `hopper publish`

---

## 6. グローバルオプション

以下のオプションは複数コマンドで共通利用できるように設計する。

### `--cwd <path>`
作業ディレクトリを指定する。

### `--plugins-dir <path>`
plugins フォルダの位置を明示する。

### `--registry-url <url>`
参照する API サーバー URL を上書きする。

### `--json`
人間向けではなく JSON 形式で出力する。

### `--silent`
不要なログ出力を抑制する。

### `--verbose`
内部処理や HTTP リクエスト、解決結果など詳細ログを表示する。

### `--yes`
確認プロンプトを自動承認する。

---

## 7. コマンド詳細

## 7-1. `hopper search <query>`

### 目的
キーワードからプラグインを検索する。

### 形式

```bash
hopper search <query>
```

### 例

```bash
hopper search economy
hopper search permissions
```

### オプション
- `--limit <number>`: 表示件数制限
- `--json`: JSON 出力

### 正常系動作
1. CLI が API の検索エンドポイントへ問い合わせる
2. 取得した候補を整形する
3. 名前、説明、作者、最新バージョンなどを表示する

### 表示例

```text
Found 3 plugins:

1. EssentialsX
   name: essentialsx
   latest: 2.20.0
   author: EssentialsX Team
   description: Core server commands and utilities

2. EconomyPlus
   name: economyplus
   latest: 1.4.2
   author: ExampleDev
   description: Economy management plugin
```

### 異常系
- 検索結果 0 件 → 0 件であることを明示
- API 到達失敗 → 接続エラー表示

---

## 7-2. `hopper info <plugin-name>`

### 目的
指定プラグインの詳細情報を表示する。

### 形式

```bash
hopper info <plugin-name>
```

### 例

```bash
hopper info essentialsx
```

### 正常系動作
1. プラグイン詳細を API から取得
2. 現在の最新バージョン、説明、作者、依存関係、対応プラットフォームを表示

### 表示項目
- name
- displayName
- description
- author
- latestVersion
- supportedPlatforms
- supportedMinecraftVersions
- dependencies
- source / homepage（将来対応可）

### 表示例

```text
EssentialsX
name: essentialsx
latest: 2.20.0
author: EssentialsX Team
platforms: paper, spigot
minecraft: 1.20, 1.21
dependencies: none

Core server commands and utilities.
```

---

## 7-3. `hopper install [plugin-name]`

### 目的
単体インストール、または manifest から一括インストールを行う。

### 形式

```bash
hopper install <plugin-name>
hopper install
```

### 単体インストール例

```bash
hopper install essentialsx
hopper install essentialsx@2.20.0
```

### manifest インストール例

```bash
hopper install
```

### オプション
- `--save`: manifest に保存する
- `--save-dev`: 将来予約。MVP では未使用扱いでもよい
- `--force`: 既存ファイルを強制上書き
- `--no-deps`: 依存関係を解決しない
- `--dry-run`: 実際には書き込まず、処理内容のみ表示

### 単体インストール処理
1. 引数から name と version range を解析
2. API に resolve リクエスト
3. 依存関係込みでインストール対象一覧を取得
4. 保存先 `plugins/` を確認
5. 必要に応じてバックアップ準備
6. jar を順番にダウンロード
7. ローカル管理データを更新
8. `--save` 指定時は manifest 更新
9. lock ファイル更新

### manifest インストール処理
1. `hopper-plugin.json` を探索
2. 記載された plugins 群を取得
3. lock があれば lock を優先
4. 各プラグインを解決しインストール
5. ローカル metadata を更新

### 成功時表示例

```text
Resolving dependencies...
Downloading essentialsx@2.20.0
Saved to plugins/EssentialsX.jar
Updated hopper-plugin-lock.json
Done.
```

### 注意点
- JAR ファイル名は registry 側メタデータまたは URL から決定
- 同名ファイルがある場合の挙動は `--force` の有無で変える
- サーバー起動中の上書きは将来警告対象にしてもよい

---

## 7-4. `hopper list`

### 目的
インストール済みプラグイン一覧を表示する。

### 形式

```bash
hopper list
```

### 正常系動作
- ローカル metadata から取得
- metadata がなければ `plugins/` をスキャンして補助的に一覧表示する

### 表示例

```text
Installed plugins:
- essentialsx 2.20.0
- luckperms 5.4.0
- vault 1.7.3
```

### 将来拡張
- `--outdated`
- `--tree`
- `--json`

---

## 7-5. `hopper remove <plugin-name>`

### 目的
指定プラグインを削除する。

### 形式

```bash
hopper remove <plugin-name>
```

### オプション
- `--force`: 依存関係警告を無視
- `--yes`: 確認省略

### 正常系動作
1. 対象プラグインをローカル metadata から確認
2. 他プラグインが依存していないか確認
3. 確認プロンプト表示
4. 対応 JAR を削除
5. metadata / lock / manifest を必要に応じて更新

### 依存考慮
- 他プラグインが依存している場合は通常エラー
- `--force` で削除可能にするかは MVP 時点では慎重に扱う

---

## 7-6. `hopper update [plugin-name]`

### 目的
単体または全体を更新する。

### 形式

```bash
hopper update
hopper update essentialsx
```

### オプション
- `--dry-run`
- `--yes`
- `--latest`: manifest range を無視して最新を採用

### 全体更新処理
1. ローカル metadata を取得
2. 各プラグインについて API へ問い合わせ
3. 新しいバージョンが存在するか判定
4. 必要なものだけダウンロード
5. lock を更新

### 単体更新処理
- 指定プラグインのみ対象にして同様の処理

### 表示例

```text
Checking for updates...
- essentialsx 2.19.0 -> 2.20.0
Updating essentialsx...
Done.
```

---

## 7-7. `hopper init`

### 目的
manifest ファイルを新規生成する。

### 形式

```bash
hopper init
```

### 正常系動作
- 作業ディレクトリからサーバー環境を確認
- 対話形式またはデフォルト値で `hopper-plugin.json` を生成

### 初期生成例

```json
{
  "name": "my-server",
  "server": {
    "platform": "paper",
    "minecraftVersion": "1.21.1"
  },
  "plugins": {}
}
```

---

## 7-8. `hopper doctor`

### 目的
現在の環境を診断する。

### 役割
- `plugins/` ディレクトリ確認
- `hopper-plugin.json` 存在確認
- API 疎通確認
- lock と metadata の整合性確認

### 例

```text
Environment check:
✓ plugins directory found
✓ hopper-plugin.json found
✓ registry reachable
⚠ lock file missing
```

---

## 8. ローカルファイル仕様

CLI は以下のファイルを扱う。

### 8-1. `hopper-plugin.json`
宣言ファイル。希望依存を管理する。

### 8-2. `hopper-plugin-lock.json`
実際に解決されたバージョンを保持する。

### 8-3. `.hopper/installed.json`
CLI 内部管理用 metadata。

例:

```json
{
  "installed": [
    {
      "name": "essentialsx",
      "version": "2.20.0",
      "fileName": "EssentialsX.jar",
      "installedAt": "2026-05-17T10:00:00Z"
    }
  ]
}
```

---

## 9. 内部モジュール設計

CLI 内部は以下の責務に分割する。

### 9-1. command layer
- commander による引数解釈
- オプションの正規化
- 実行関数呼び出し

### 9-2. service layer
- install / update / remove などユースケース本体
- resolve 結果の解釈
- metadata / manifest / lock 更新

### 9-3. registry client
- API との通信抽象化
- fetch / search / resolve など

### 9-4. file system layer
- plugins 保存
- ローカル JSON ファイル読み書き
- パス検証

### 9-5. formatter layer
- 画面表示整形
- JSON 出力整形
- エラー表示整形

---

## 10. 出力方針

### 10-1. 人間向け出力
- 必要最低限かつ読みやすく
- 成功・警告・失敗を区別する
- 行数を増やしすぎない

### 10-2. JSON 出力
`--json` 指定時はスクリプト連携可能な形式にする。

例:

```json
{
  "ok": true,
  "command": "search",
  "results": [
    {
      "name": "essentialsx",
      "latestVersion": "2.20.0"
    }
  ]
}
```

---

## 11. エラー設計

### 11-1. エラー分類
- UserError: 入力ミス
- NetworkError: API 接続失敗
- ResolveError: 依存解決失敗
- FileSystemError: 保存 / 削除失敗
- RegistryError: registry 側の不整合

### 11-2. 表示方針
ユーザーに以下が伝わるようにする。
- 何に失敗したか
- なぜ失敗した可能性が高いか
- 次に何を試すべきか

例:

```text
Failed to install 'vault'.
Reason: Registry request timed out.
Try again later or check --registry-url.
```

---

## 12. UX 方針

### 12-1. 重要な UX 目標
- 初見でも迷わない
- 成功時に安心できる
- 失敗時に次の行動がわかる
- `npm` に慣れた人が違和感なく使える

### 12-2. 確認プロンプト
破壊的操作や上書き時のみ表示する。

例:
- remove
- force overwrite
- lock 再生成

---

## 13. テスト対象

最低限以下をテスト対象とする。

- search の正常系
- info の正常系
- install の正常系
- install の依存解決
- remove の安全性
- update の差分判定
- manifest 読み込み
- lock 読み込み
- path traversal 防止

---

## 14. 実装優先順位

### Phase 1
- `search`
- `info`
- `install <name>`

### Phase 2
- `list`
- `remove`
- `update`

### Phase 3
- `init`
- `install` from manifest
- lock file

### Phase 4
- `doctor`
- `--json`
- `--dry-run`

---

## 15. 今後さらに詰めるべき点

- install 時のファイル名決定ルール
- manifest 更新ポリシー
- remove 時の依存参照仕様
- update と semver の厳密仕様
- 対話プロンプトの UX
- JSON 出力スキーマの固定

