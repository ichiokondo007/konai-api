# konai-api セットアップ / 維持管理ドキュメント

ローカルLLM(Raspberry Pi 5 + AX8850 NPU 上で `axllm serve` で動作する Qwen axmodel、OpenAI互換API)への中継を行う TypeScript製 Express サーバー。

最終更新: 2026-06-11

---

## 1. 前提環境

| ツール | バージョン(構築時) | 備考 |
|--------|---------------------|------|
| Node.js | v22.21.1 | ネイティブ `fetch` 利用可 |
| pnpm | 10.18.3 | `package.json` の `packageManager` で固定 |
| OS | Linux (Fedora系) | |

ローカルLLM側:
- Raspberry Pi 5 + AX8850 NPU
- `axllm serve` でOpenAI互換サーバーを起動済みであること
- 既定エンドポイント想定: `http://<raspi5のIP>:8000/v1`

---

## 2. 技術選定

| 項目 | 採用 | 理由 |
|------|------|------|
| 言語/実行 | TypeScript + **tsx**(開発) / **tsc**(ビルド・型チェック) | バックエンドAPIに最適。tsxは設定不要・高速でホットリロード。型はtscで担保。 |
| バンドラ | **なし(Viteは不採用)** | 純粋なAPIサーバーにフロント向けViteは過剰。 |
| Webフレームワーク | Express 5系 | |
| LLMクライアント | openai SDK 6系 | axllmがOpenAI互換のため `baseURL` 差し替えのみで利用可能。 |
| モジュール | ESM (`type: module`, NodeNext) | 相対importは `.js` 拡張子付きで記述。 |

> tsx は型チェックを行わない(esbuildベース)。型の担保は `pnpm typecheck` で別途実施する。

---

## 3. インストール手順(再現用)

ゼロから再構築する場合の手順。

```bash
# 1. ランタイム依存
pnpm add express openai dotenv cors

# 2. 開発依存
pnpm add -D typescript tsx @types/node @types/express @types/cors

# 3. esbuild のビルドスクリプト許可(tsxの依存)
#    package.json の pnpm.onlyBuiltDependencies に "esbuild" を記載済み。
#    クリーンインストール後に警告が出る場合は明示承認:
#    pnpm approve-builds
```

### インストール済みパッケージ

ランタイム依存:
- `express` ^5.2.1
- `openai` ^6.42.0
- `dotenv` ^17.4.2
- `cors` ^2.8.6

開発依存:
- `typescript` ^6.0.3
- `tsx` ^4.22.4
- `@types/node` ^25.9.3
- `@types/express` ^5.0.6
- `@types/cors` ^2.8.19

> 注: `pnpm-workspace.yaml`(`enablePrePostScripts: true`)はセットアップ時の設定コマンドで生成。

---

## 4. ディレクトリ構成

```
konai-api/
├── package.json          # type:module, scripts(dev/build/start/typecheck)
├── tsconfig.json         # ESM(NodeNext) + strict
├── pnpm-workspace.yaml    # enablePrePostScripts: true
├── .env.example          # 設定テンプレート(コミット対象)
├── .env                  # 実設定(gitignore対象・コミットしない)
├── .gitignore
├── docs/
│   └── SETUP.md          # 本ドキュメント
└── src/
    ├── index.ts          # Expressエントリ。/health と /api をマウント
    ├── config.ts         # 環境変数の一元管理
    ├── llm.ts            # OpenAI SDK を axllm の baseURL に差し替え
    └── routes/
        └── chat.ts       # POST /api/chat(通常応答 + SSEストリーミング)
```

---

## 5. 環境変数

`.env`(`.env.example` をコピーして作成)で設定する。

| 変数 | 既定値 | 説明 |
|------|--------|------|
| `PORT` | `3000` | 本Expressサーバーの待受ポート |
| `LLM_BASE_URL` | `http://localhost:8000/v1` | axllm のOpenAI互換エンドポイント。**実機運用時はRaspi5のIPに変更必須** |
| `LLM_API_KEY` | `not-needed` | ローカルでは通常未使用だがSDKが非空文字を要求するためダミー値 |
| `LLM_MODEL` | `qwen` | axllmに登録されたモデル名に合わせる |

---

## 6. 開発・運用コマンド

```bash
pnpm dev        # tsx watch でホットリロード開発(src/index.ts)
pnpm typecheck  # tsc --noEmit。型チェックのみ(tsxは型を見ないため必須)
pnpm build      # tsc。dist/ にJS出力
pnpm start      # node dist/index.js。本番起動
```

---

## 7. エンドポイント

### GET /health
サーバー稼働確認。LLMには接続しない。
```bash
curl -s http://localhost:3000/health
# => {"status":"ok","llm":"http://localhost:8000/v1","model":"qwen"}
```

### POST /api/chat
ローカルLLMへチャット補完を中継。

リクエスト body:
| フィールド | 必須 | 説明 |
|------------|------|------|
| `messages` | ○ | `{role, content}` の配列(非空) |
| `model` | – | 省略時は `LLM_MODEL` |
| `stream` | – | `true` でSSEストリーミング |

通常応答:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"こんにちは"}]}'
# => {"model":"qwen","content":"...","usage":{...}}
```

ストリーミング(SSE):
```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"こんにちは"}],"stream":true}'
# => data: {"delta":"..."} ... data: [DONE]
```

エラー時:
- `400` … `messages` が不正
- `502` … ローカルLLMへ到達不可(`detail` に原因)

---

## 8. トラブルシューティング

| 症状 | 対処 |
|------|------|
| `/api/chat` が 502 | `axllm serve` の起動と `LLM_BASE_URL` を確認。`curl <LLM_BASE_URL>/models` で疎通確認 |
| 型エラーが起動時に出ない | tsxは型を見ない仕様。`pnpm typecheck` で確認 |
| インストール時に esbuild の警告 | `pnpm approve-builds` で承認(設定は package.json に記載済み) |
| import で拡張子エラー | ESM構成のため相対importは `.js` 拡張子付きで記述する |
