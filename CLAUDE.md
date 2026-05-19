# hopper

Minecraft Java Edition プラグインマネージャー CLI。
npm 風の操作感で Modrinth と Hangar を同時クエリし、最適な結果を提供する。

## 技術スタック

- **Runtime**: Node.js (ESM)
- **Language**: TypeScript (strict, ES2022, NodeNext)
- **CLI**: Commander.js
- **HTTP**: fetch + Zod
- **Output**: ora (spinner) + chalk (color)
- **Monorepo**: pnpm workspaces (`packages/cli`)
- **Test**: Vitest
- **Lint**: oxlint

## ディレクトリ構造

```
packages/cli/src/
├── commands/     # コマンド登録（Commander.js）
├── services/     # ビジネスロジック
├── registries/   # Modrinth & Hangar API
├── fs/           # ファイル操作（manifest, lock, installed）
├── formatter/    # 出力フォーマッタ（human, json-output）
└── index.ts      # エントリポイント
```

## コマンド

| コマンド | 説明 |
|---------|------|
| install | プラグインをインストール |
| search  | プラグインを検索 |
| info    | プラグイン詳細表示 |
| list    | インストール済み一覧 |
| remove  | プラグインを削除 |
| update  | プラグインを更新 |
| init    | hopper-plugin.json を初期化 |
| doctor  | 環境診断 |

## ビルド・開発

```bash
pnpm -C packages/cli build       # TypeScript コンパイル
pnpm -C packages/cli dev         # watch モード
pnpm -C packages/cli test        # Vitest
pnpm -C packages/cli lint        # oxlint
pnpm -C packages/cli typecheck   # tsc --noEmit
```

## 重要ファイル

| ファイル | 説明 |
|---------|------|
| `hopper-plugin.json` | プラグイン定義（マニフェスト） |
| `hopper-plugin-lock.json` | ロックファイル |
| `.hopper/installed.json` | インストール履歴 |

## 実装パターン

### コマンド層 (`commands/`)
- `cmd.parent?.opts()` でグローバルオプション (`cwd`, `pluginsDir`, `json`, `silent`) を取得
- `ora({ isSilent: ... })` でスピナー、`--json` で JSON 出力切り替え
- エラー時は `spinner.fail()` → `process.exit(1)`

### サービス層 (`services/`)
- `XxxOptions` / `XxxResult` インターフェースを明示定義
- `onProgress?: (msg: string) => void` コールバックで進捗通知
- `dryRun` 時はファイル書き込み・削除をスキップ

### fs 層 (`fs/`)
- ENOENT → null または空配列を返す（エラーにしない）
- パース失敗 → `UserError` を投げる
- Zod スキーマで読み書き両方を検証

### エラー種別 (`services/errors.ts`)
`UserError`, `NetworkError`, `ResolveError`, `FileSystemError`, `RegistryError`

## グローバルオプション

`--cwd`, `--plugins-dir`, `--json`, `--silent`, `--verbose`, `--yes`
