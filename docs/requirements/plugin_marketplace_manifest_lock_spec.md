# Minecraft Plugin Marketplace - manifest / lock ファイル正式仕様 v0.1

## 1. 目的

本書は Minecraft Plugin Marketplace における **宣言ファイル（manifest）** と **lock ファイル** の役割、形式、解釈ルール、更新ルールを定義する。

この仕様により、以下を実現する。

- プラグイン環境の再現性向上
- 単体インストールではなく宣言的管理への移行
- チーム開発や複数サーバー環境での共有
- 将来的な自動更新や CI 連携への拡張

---

## 2. ファイルの役割

## 2-1. manifest ファイル

ファイル名:

```text
hopper-plugin.json
```

役割:

- ユーザーが「このサーバーで使いたいプラグイン」を宣言する
- 望ましいバージョン範囲を記述する
- サーバーの対象 platform / Minecraft バージョンを示す

これは npm における `package.json` に近い役割を持つ。

## 2-2. lock ファイル

ファイル名:

```text
hopper-plugin-lock.json
```

役割:

- 実際に解決された厳密なバージョンを記録する
- 再現性を担保する
- 依存解決結果を固定する

これは npm / pnpm における lockfile に近い役割を持つ。

---

## 3. 基本原則

### 3-1. manifest は「希望」

manifest は利用者が望む依存関係を表す。

例:

- `^2.20.0`
- `>=1.0.0 <2.0.0`

### 3-2. lock は「実際」

lock は install/update 実行時に確定したバージョンを表す。

例:

- `2.20.3`
- `5.4.2`

### 3-3. install の優先順位

- lock が存在すれば lock を優先
- lock が存在しなければ manifest を解決
- manifest がなければ単体指定に従う

---

## 4. manifest 仕様

## 4-1. 最小構造

```json
{
  "name": "my-server",
  "server": {
    "platform": "paper",
    "minecraftVersion": "1.21.1"
  },
  "plugins": {
    "essentialsx": "^2.20.0"
  }
}
```

---

## 4-2. フィールド一覧

### `name`

- 型: string
- 必須
- サーバー設定名またはプロジェクト名

### `server`

- 型: object
- 必須
- サーバー環境情報を持つ

#### `server.platform`

- 型: string
- 必須
- 例: `paper`, `spigot`, `folia`

#### `server.minecraftVersion`

- 型: string
- 必須
- 例: `1.21.1`

### `plugins`

- 型: object
- 必須
- キーがプラグイン名、値がバージョン range

例:

```json
{
  "plugins": {
    "essentialsx": "^2.20.0",
    "luckperms": "^5.4.0"
  }
}
```

---

## 4-3. 将来拡張フィールド案

以下は将来追加可能だが、MVP では必須にしない。

### `registry`

使用する registry URL を上書きする。

### `description`

サーバー構成の説明文。

### `private`

公開不可設定。

### `scripts`

将来の補助コマンド定義。

### `pluginGroups`

プラグインセットのグルーピング。

---

## 4-4. バージョン指定ルール

`plugins` の値には semver 風の range を許可する。

### 許可例

- `1.0.0`
- `^1.0.0`
- `~1.2.0`
- `>=1.0.0 <2.0.0`
- `latest`（将来非推奨にしてもよい）

### 初期実装の現実的方針

MVP では以下を優先的にサポートする。

- 固定バージョン
- `^`
- `~`
- range 未指定時は latest

---

## 4-5. manifest の解釈ルール

### `hopper install`

- lock があれば lock 優先
- lock がなければ manifest の plugins を解決

### `hopper install <name> --save`

- manifest の `plugins` に追加または更新
- 必要なら lock 更新

### `hopper update`

- manifest の range を基準に、許可される最新版へ更新
- `--latest` 指定時は range を超えて更新可能

---

## 5. lock ファイル仕様

## 5-1. 最小構造

```json
{
  "lockfileVersion": 1,
  "generatedAt": "2026-05-17T10:00:00Z",
  "server": {
    "platform": "paper",
    "minecraftVersion": "1.21.1"
  },
  "plugins": {
    "essentialsx": {
      "version": "2.20.3",
      "fileName": "EssentialsX.jar",
      "downloadUrl": "https://example.com/essentialsx-2.20.3.jar",
      "dependencies": {}
    }
  }
}
```

---

## 5-2. フィールド一覧

### `lockfileVersion`

- 型: number
- 必須
- lock ファイル仕様のバージョン

### `generatedAt`

- 型: string (ISO 8601)
- 必須
- 最後に生成した日時

### `server`

- 型: object
- 必須
- lock が解決対象としたサーバー条件

### `plugins`

- 型: object
- 必須
- キー: plugin name
- 値: 解決済みメタデータ

---

## 5-3. 各 plugin エントリ仕様

```json
{
  "version": "2.20.3",
  "fileName": "EssentialsX.jar",
  "downloadUrl": "https://example.com/essentialsx-2.20.3.jar",
  "integrity": "sha256-...",
  "dependencies": {
    "vault": "1.7.3"
  }
}
```

### `version`

実際に導入するバージョン。

### `fileName`

保存対象の JAR ファイル名。

### `downloadUrl`

取得元 URL。

### `integrity`

将来または任意。ハッシュ検証用。

### `dependencies`

そのプラグインが依存している解決済み依存の一覧。

---

## 5-4. lock の性質

- lock は machine-generated を基本とする
- 人間が読むことはできるが、手編集は推奨しない
- CLI が更新責任を持つ

---

## 6. manifest と lock の関係

### 6-1. install 時

- lock がある → lock の厳密バージョンを使う
- lock がない → manifest を解決し、新しく lock を作る

### 6-2. update 時

- 現在の lock を参照
- manifest の range 内で更新可能な最新版へ変更
- 更新後は lock 再生成

### 6-3. remove 時

- manifest から削除するかは `--save` や将来仕様で制御してもよい
- lock からは対象を削除する

---

## 7. 単体インストール時のルール

### 7-1. `hopper install essentialsx`

manifest が存在しない場合:

- 単体インストールのみ実行
- `.hopper/installed.json` など内部管理には反映
- manifest は変更しない

manifest が存在する場合:

- `--save` なしなら manifest は変更しない
- `--save` ありなら manifest に追加する
- lock は更新する

### 7-2. `hopper install essentialsx@2.20.0 --save`

- manifest に `essentialsx: 2.20.0` を追加
- lock に厳密解決結果を保存

---

## 8. 更新ルール

## 8-1. `hopper update`

- manifest range と server 条件を前提に再解決
- lock を更新

## 8-2. `hopper update --latest`

- manifest range を一時的に無視または更新対象を拡大
- 仕様として危険なので確認プロンプト推奨

## 8-3. lock のみ再生成

将来的に以下のようなコマンドも追加可能。

```bash
hopper install --lock-only
```

または

```bash
hopper lock
```

MVP では未対応でもよい。

---

## 9. 依存関係の記録ルール

### 9-1. manifest には直接依存のみ記録

manifest はユーザーが明示的に欲しい plugin のみ記録する。

例:

```json
{
  "plugins": {
    "plugin-a": "^1.0.0"
  }
}
```

`plugin-b` が依存で必要でも、通常は manifest に自動追加しない。

### 9-2. lock には解決済み依存も記録

lock は導入に必要な全依存を保持する。

---

## 10. 競合時の扱い

### 10-1. manifest 上の競合

例:

- `plugin-a` が `vault >=2`
- `plugin-c` が `vault <2`

この場合:

- install/update は失敗
- lock は更新しない
- 明確な競合エラーを返す

### 10-2. lock と manifest の不一致

例:

- manifest は `^2.20.0`
- lock は `1.19.0`

この場合:

- install/update 実行時に再解決対象として扱う
- lock を正しい状態へ上書きする

---

## 11. ファイル探索ルール

CLI は以下の順で manifest / lock を探索する。

1. `--cwd` 指定ディレクトリ
2. カレントディレクトリ

対象ファイル:

- `hopper-plugin.json`
- `hopper-plugin-lock.json`

MVP では親ディレクトリを遡る仕様はなくてもよい。

---

## 12. バリデーション仕様

## 12-1. manifest バリデーション

最低限チェックする項目:

- JSON である
- `name` が string
- `server.platform` が string
- `server.minecraftVersion` が string
- `plugins` が object
- plugin 名が空文字でない
- version range が文字列である

## 12-2. lock バリデーション

最低限チェックする項目:

- `lockfileVersion` が number
- `generatedAt` が string
- `plugins` が object
- 各 plugin に `version`, `fileName`, `downloadUrl` がある

バリデーション失敗時は、CLI が修復可能な場合と不可な場合を分ける。

---

## 13. 推奨運用ルール

### 13-1. Git 管理

- `hopper -plugin.json` はコミット推奨
- `hopper-plugin-lock.json` もコミット推奨

理由:

- チームで同じ環境を再現できる
- CI や別マシン環境で同じ構成が再現できる

### 13-2. 手編集

- manifest は手編集してよい
- lock は原則手編集非推奨

---

## 14. 将来拡張案

### 14-1. checksum / integrity 必須化

不正 jar 混入防止。

### 14-2. optionalDependencies

任意依存対応。

### 14-3. peerDependencies 的仕様

特定 plugin との共存条件を表現。

### 14-4. overrides

依存の強制固定。

例:

```json
{
  "overrides": {
    "vault": "1.7.3"
  }
}
```

### 14-5. mirrors

ダウンロードミラー設定。

---

## 15. サンプル

## 15-1. 実践的 manifest 例

```json
{
  "name": "survival-main",
  "server": {
    "platform": "paper",
    "minecraftVersion": "1.21.1"
  },
  "plugins": {
    "essentialsx": "^2.20.0",
    "luckperms": "^5.4.0",
    "vault": "^1.7.3"
  }
}
```

## 15-2. 実践的 lock 例

```json
{
  "lockfileVersion": 1,
  "generatedAt": "2026-05-17T10:00:00Z",
  "server": {
    "platform": "paper",
    "minecraftVersion": "1.21.1"
  },
  "plugins": {
    "essentialsx": {
      "version": "2.20.3",
      "fileName": "EssentialsX.jar",
      "downloadUrl": "https://example.com/essentialsx-2.20.3.jar",
      "dependencies": {
        "vault": "1.7.3"
      }
    },
    "vault": {
      "version": "1.7.3",
      "fileName": "Vault.jar",
      "downloadUrl": "https://example.com/vault-1.7.3.jar",
      "dependencies": {}
    },
    "luckperms": {
      "version": "5.4.2",
      "fileName": "LuckPerms-Bukkit.jar",
      "downloadUrl": "https://example.com/luckperms-5.4.2.jar",
      "dependencies": {}
    }
  }
}
```

---

## 16. 今後さらに詰めるべき点

- semver の厳密仕様
- lock に依存木全体をどう記録するか
- fileName を registry 側で固定するか URL から決めるか
- integrity 必須化のタイミング
- `--save` / `--save-exact` の導入可否
- 複数 platform 条件の表現方法
