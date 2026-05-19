# Minecraft Plugin Marketplace - API 設計書 v0.1

## 1. 目的

本書は Minecraft Plugin Marketplace における API Server の責務、エンドポイント、レスポンス形式、エラー設計、内部構造方針を定義する。

MVP 段階では API は以下を目的とする。

- CLI に対してプラグイン情報を提供する
- registry JSON を HTTP 経由で取得可能にする
- 将来の DB 化・WebUI 化に備えて、CLI とデータ層を疎結合にする

---

## 2. API の役割

### 2-1. 現時点の責務
- プラグイン検索
- 単一プラグイン取得
- バージョン一覧取得
- 依存解決用データ返却
- ヘルスチェック

### 2-2. 現時点で持たない責務
- 認証
- 投稿者管理
- レビュー投稿
- 高度な権限管理
- 管理画面機能
- 外部マーケットとの完全同期

---

## 3. 技術方針

### 3-1. 初期実装
- Node.js
- TypeScript
- Fastify
- Zod

### 3-2. 将来候補
- PostgreSQL / Supabase
- Drizzle ORM または Prisma
- Redis（必要なら）
- CDN / Object Storage

### 3-3. 初期保存先
MVP 段階では registry JSON を読み込んでレスポンスを生成する。

---

## 4. ベース URL

開発時の仮 URL:

```text
http://localhost:3000
```

API バージョニングは MVP 時点では必須ではないが、将来的な変更を見越し以下のような構成にしやすい形を推奨する。

```text
/api/plugins
/api/health
```

または将来:

```text
/api/v1/plugins
/api/v1/health
```

---

## 5. データモデル前提

API が返す基本モデルは以下を前提とする。

### 5-1. PluginSummary

```ts
interface PluginSummary {
  name: string;
  displayName: string;
  description: string;
  author: string;
  latestVersion: string;
}
```

### 5-2. PluginVersion

```ts
interface PluginVersion {
  version: string;
  minecraft: string[];
  platform: string[];
  downloadUrl: string;
  dependencies: {
    name: string;
    range: string;
    optional?: boolean;
  }[];
}
```

### 5-3. PluginDetail

```ts
interface PluginDetail {
  name: string;
  displayName: string;
  description: string;
  author: string;
  latestVersion: string;
  versions: PluginVersion[];
}
```

---

## 6. 共通レスポンス方針

### 6-1. 正常系
レスポンスは原則 JSON とする。

共通例:

```json
{
  "ok": true,
  "data": {}
}
```

### 6-2. 異常系
エラー時は以下を基本形とする。

```json
{
  "ok": false,
  "error": {
    "code": "PLUGIN_NOT_FOUND",
    "message": "Plugin 'abc' was not found."
  }
}
```

### 6-3. エラーコード原則
メッセージ文字列だけに依存せず、機械処理しやすい `code` を必ず返す。

---

## 7. エンドポイント設計

## 7-1. GET `/api/health`

### 目的
ヘルスチェック。

### レスポンス例

```json
{
  "ok": true,
  "data": {
    "status": "healthy"
  }
}
```

### 用途
- CLI の `hopper doctor`
- 動作確認
- 将来の監視用

---

## 7-2. GET `/api/plugins`

### 目的
プラグイン検索または一覧取得。

### クエリパラメータ
- `q`: 検索キーワード
- `limit`: 取得件数
- `offset`: 将来のページング用
- `platform`: paper / spigot など
- `minecraft`: 1.21 など

### 例

```http
GET /api/plugins?q=economy&limit=10
```

### 正常系レスポンス

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "name": "essentialsx",
        "displayName": "EssentialsX",
        "description": "Core server commands and utilities",
        "author": "EssentialsX Team",
        "latestVersion": "2.20.0"
      }
    ],
    "total": 1
  }
}
```

### 検索仕様
MVP では以下の緩い条件でよい。
- name 部分一致
- displayName 部分一致
- description 部分一致

将来的には全文検索対応可能。

---

## 7-3. GET `/api/plugins/:name`

### 目的
名前による単一プラグイン詳細取得。

### 例

```http
GET /api/plugins/essentialsx
```

### 正常系レスポンス

```json
{
  "ok": true,
  "data": {
    "name": "essentialsx",
    "displayName": "EssentialsX",
    "description": "Core server commands and utilities",
    "author": "EssentialsX Team",
    "latestVersion": "2.20.0",
    "versions": [
      {
        "version": "2.20.0",
        "minecraft": ["1.20", "1.21"],
        "platform": ["paper", "spigot"],
        "downloadUrl": "https://example.com/essentialsx.jar",
        "dependencies": []
      }
    ]
  }
}
```

### 異常系
- 対象が存在しない場合は 404

例:

```json
{
  "ok": false,
  "error": {
    "code": "PLUGIN_NOT_FOUND",
    "message": "Plugin 'essentialsxx' was not found."
  }
}
```

---

## 7-4. GET `/api/plugins/:name/versions`

### 目的
指定プラグインのバージョン一覧を返す。

### 例

```http
GET /api/plugins/essentialsx/versions
```

### 正常系レスポンス

```json
{
  "ok": true,
  "data": {
    "name": "essentialsx",
    "versions": [
      {
        "version": "2.20.0",
        "minecraft": ["1.20", "1.21"],
        "platform": ["paper", "spigot"],
        "downloadUrl": "https://example.com/essentialsx.jar",
        "dependencies": []
      }
    ]
  }
}
```

### 用途
- CLI の `info`
- 将来的な UI のバージョン選択

---

## 7-5. GET `/api/plugins/:name/resolve`

### 目的
CLI install/update 用に、指定条件に基づく解決済み情報を返す。

MVP では「API が完全解決」でも「API は候補だけ返し CLI が再帰解決」でもよいが、本設計では段階的実装を意識し、
**初期は API が対象 plugin のバージョン候補を返し、CLI 側で再帰解決する前提**を採る。

ただし将来的には API 側完全解決に移行可能な余地を残す。

### クエリパラメータ
- `version`: 明示バージョンまたは range
- `platform`: paper / spigot
- `minecraft`: 1.21.1 など

### 例

```http
GET /api/plugins/essentialsx/resolve?version=%5E2.20.0&platform=paper&minecraft=1.21.1
```

### 正常系レスポンス（初期案）

```json
{
  "ok": true,
  "data": {
    "plugin": {
      "name": "essentialsx",
      "version": "2.20.0",
      "downloadUrl": "https://example.com/essentialsx.jar",
      "dependencies": []
    }
  }
}
```

### 将来拡張レスポンス案

```json
{
  "ok": true,
  "data": {
    "root": {
      "name": "plugin-a",
      "version": "1.0.0"
    },
    "resolved": [
      {
        "name": "plugin-b",
        "version": "1.2.0",
        "downloadUrl": "https://example.com/plugin-b.jar"
      },
      {
        "name": "plugin-a",
        "version": "1.0.0",
        "downloadUrl": "https://example.com/plugin-a.jar"
      }
    ]
  }
}
```

---

## 8. HTTP ステータスコード方針

### 200
正常処理

### 400
クエリ不正、バージョン指定不正など

### 404
指定プラグインが見つからない

### 409
依存競合などの論理矛盾

### 500
サーバー内部エラー

### 503
registry 読み込み失敗など一時障害

---

## 9. バリデーション方針

### 9-1. 入力バリデーション
Zod などで以下を検証する。
- `name` が空でない
- `limit` が整数で範囲内
- `platform` が許可値である
- `minecraft` が最低限文字列として有効

### 9-2. 出力バリデーション
MVP では最低限でもよいが、内部 registry の破損検知のため、返却前に schema validate できる構成が望ましい。

---

## 10. API 内部構造

### 10-1. route layer
- Fastify route 定義
- request / response schema

### 10-2. controller layer
- HTTP をユースケース呼び出しへ変換
- status code 決定

### 10-3. service layer
- search plugin
- get plugin detail
- resolve version

### 10-4. repository layer
- registry JSON 読み込み
- 将来は DB repository に置換可能

### 10-5. schema layer
- plugin schema
- response schema
- query param schema

---

## 11. 初期 registry repository 設計

MVP では repository が JSON を読む。

### 必要メソッド例

```ts
interface PluginRepository {
  findMany(query?: {
    q?: string;
    platform?: string;
    minecraft?: string;
    limit?: number;
    offset?: number;
  }): Promise<PluginSummary[]>;

  findByName(name: string): Promise<PluginDetail | null>;
}
```

### 将来差し替え方針
この interface を維持すれば DB 化が容易になる。

---

## 12. バージョン解決方針

### 12-1. MVP 方針
- semver 互換を意識する
- ただし最初は厳密すぎる解釈を避けてよい
- 指定がない場合は latestVersion を採用
- 指定 range に合う version のうち最も新しいものを採用
- 該当なしなら 400 or 404 ではなく resolve failure として返す

### 12-2. 競合
- API 単体では競合全体の責務を持たない
- 初期競合判定は CLI 側でもよい
- 将来的に API 側でまとめて解決してもよい

---

## 13. エラーコード一覧案

- `PLUGIN_NOT_FOUND`
- `INVALID_QUERY`
- `INVALID_PLATFORM`
- `INVALID_MINECRAFT_VERSION`
- `VERSION_NOT_FOUND`
- `DEPENDENCY_CONFLICT`
- `REGISTRY_UNAVAILABLE`
- `INTERNAL_ERROR`

---

## 14. ログ方針

### 開発時
- 受信リクエスト
- route 処理時間
- repository 読み込み結果
- エラー詳細

### 本番時（将来）
- 個人情報がないため基本的に通常ログ中心でよい
- ただし投稿機能導入後は注意が必要

---

## 15. テスト方針

### 単体テスト
- query validation
- plugin search service
- findByName
- resolve version

### 結合テスト
- `/api/health`
- `/api/plugins`
- `/api/plugins/:name`
- `/api/plugins/:name/versions`
- `/api/plugins/:name/resolve`

### 異常系テスト
- plugin not found
- invalid limit
- invalid version range
- broken registry data

---

## 16. 将来追加予定エンドポイント

以下は MVP 後に追加しうる。

### POST `/api/plugins`
投稿機能

### PATCH `/api/plugins/:name`
管理者編集機能

### GET `/api/plugins/trending`
人気順

### GET `/api/plugins/recommendations`
おすすめ

### POST `/api/auth/*`
認証系

---

## 17. 実装順序

### Phase 1
- `/api/health`
- `/api/plugins`
- `/api/plugins/:name`

### Phase 2
- `/api/plugins/:name/versions`
- repository interface 導入

### Phase 3
- `/api/plugins/:name/resolve`
- semver 対応
- platform / minecraft 条件対応

### Phase 4
- キャッシュ
- DB 化
- 投稿機能準備

---

## 18. 今後詰めるべき点

- resolve を CLI 主体にするか API 主体にするかの最終決定
- semver の厳密実装仕様
- platform / minecraft のフィルタ判定方法
- response schema の厳密固定
- DB 化後の index 設計

