# Refactoring Plan

## 前提

この計画は [REFACTORING_NOTES.md](./REFACTORING_NOTES.md) を前提にする。

優先すること:

* 既存のスタイル検索体験の改善
* ノード上での操作性向上
* 既存ブラウザ UI の整理と利便性向上
* 3 スロット運用を前提としたワークフロー改善

当面は扱わないこと:

* 完全オフライン化
* データ取得元や画像取得元の差し替え
* 新たなリモート連携の追加や拡張

## 現状整理

### 1. バックエンド本体は小さいが、周辺機能が肥大化していた

`nodes.py` のノード本体は、3 つの artist スロットから 3 本の prompt を組み立てるだけで責務が小さい。
一方で周辺機能は `artist_data.py`、`routes_core.py`、`routes_favorites.py` などに分散し、モジュール単位の責務が広かった。

### 2. 旧リモート連携が全体構成に深く入り込んでいた

当初は backend の route 登録と frontend browser の両方に、不要になったリモート連携の導線が残っていた。
これはローカル style browser と 3 スロット運用を中心に据えたい方針と噛み合っていなかった。

この点は refactor の過程で削除済み。

### 3. フロントエンドは部分分割済みだが、状態管理はまだ集中している

`browser.js` は 900 行超で、次の責務を 1 つに抱えている。

* ブラウザ全体の状態管理
* favorites 管理
* 一覧描画
* カテゴリ切替
* swipe 連携
* local/session storage 管理

`browser_events.js`、`browser_cards.js`、`browser_renderers.js` への分離は進んでいるため、全面書き直しより責務単位の再配置が向いている。

### 4. ノード UI 拡張は ComfyUI の内部実装に強く依存している

`js/index.js` は `beforeRegisterNodeDef` を使っている一方で、複数回の delayed patch、`nodeType.prototype.onNodeCreated` の差し替え、`widget.inputEl` 直接操作、`document.body` への DOM 追加に依存している。

現状でも動く可能性は高いが、将来の ComfyUI 側変更に対して壊れやすい層になっている。

### 5. データ取得とキャッシュがモジュールグローバルに寄っている

`artist_data.py` は次を 1 ファイルで持っている。

* リモート取得
* JSON 保存
* メモリキャッシュ
* 画像キャッシュ
* 一括画像ダウンロード
* ランダム取得

機能は成立しているが、検索体験改善や 3 スロット最適化を進める際に差し込みづらい構造になっている。

### 6. 自動テストがない

現状ワークスペース内にテストファイルはなく、主要ロジックの変更に対する安全網がない。

## リファクタリング方針

### 方針 1. まず「不要機能を中心フローから外す」

使われていない旧リモート連携を削除し、主役を「ローカルのスタイル探索」と「3 スロット運用」に戻す。

### 方針 2. 次に「状態」と「UI」を分離する

今のフロントエンドは描画部品の分割より、状態遷移の分離が優先。
まず store / controller 相当の層を作り、その上に browser UI を載せる。

### 方針 3. Python 側は service 化して薄い route にする

route 関数にロジックを持たせず、データアクセスや永続化は service / store 層へ寄せる。

### 方針 4. Nodes 2.0 / 将来互換は「壊れやすい箇所の隔離」で対応する

この段階では backend V3 への全面移行より、現行機能を保ちながらノード UI パッチ層を薄くし、依存点を 1 箇所に閉じ込める方が優先度が高い。

## 実施フェーズ

## Phase 1: スコープ整理

目的:
ローカルスタイルブラウザと 3 スロット運用を中心に戻す。

実施内容:

* `routes.py` から不要な remote route を外し、 core / favorites のみを残す
* `browser_template.js` から旧 remote 連携前提の UI を除去する
* `browser.js` を styles + local favorites 中心の設計へ寄せる
* README と UI 文言を現在の優先機能に合わせる

完了条件:

* ローカル機能だけで主要ワークフローが自然に成立する
* コード上の中心概念が「artist browser」と「slot workflow」になる

## Phase 2: Python 側の責務分離

目的:
データ取得・保存・ favorites を差し替えやすくする。

実施内容:

* `artist_data.py` を以下に分割する
* `services/artist_repository.py`
* `services/image_cache.py`
* `services/artist_sync.py`
* `routes_favorites.py` のファイル永続化ロジックを `stores/favorites_store.py` へ分離する
* route は request / response 変換だけに近づける
* グローバルキャッシュとステータス管理を薄い manager に閉じ込める

完了条件:

* route モジュールを読めば API 面だけ追える
* データ更新ロジックを unit test 可能な関数にできる

## Phase 3: ノード操作モデルの明確化

目的:
3 スロット運用を UI の都合ではなくドメインとして扱う。

実施内容:

* `js/utils.js` の slot 操作を `slot_state.js` のような独立モジュールへ切り出す
* artist 正規化、 slot 決定、 prompt 合成ルールを純関数化する
* `js/index.js` は「ノードへ widget / button を付与する層」に限定する
* `AutoCycle` も slot state API を使うように寄せる

完了条件:

* 3 スロットの挙動を UI なしで説明できる
* apply / clear / cycle の仕様が単体で検証できる

## Phase 4: ブラウザ状態管理の再編

目的:
検索、 favorites、選択、表示を独立して改善できる構造にする。

実施内容:

* `browser.js` を以下のように分割する
* `browser_store.js`: filter, sort, selected, favorites などの状態
* `browser_controller.js`: 読み込み、更新、操作フロー
* `browser_view.js`: 描画のオーケストレーション
* `browser.js`: open / close の facade
* styles 一覧と favorites 一覧の描画経路を明確に分ける
* localStorage/sessionStorage の key 管理を 1 モジュールへ集約する

完了条件:

* `browser.js` が巨大な state machine ではなく薄い入口になる
* 検索改善や並び替え改善を個別に入れやすくなる

## Phase 5: 検索体験と操作性の改善

目的:
`REFACTORING_NOTES.md` の本命を実装しやすい土台の上で UX を改善する。

候補:

* 検索語の正規化改善
* favorites / recent / highlighted の見せ方改善
* 現在スロットへの明示投入 UI
* スロットごとの quick action
* prompt テキストと artist 選択の往復操作改善
* swipe / auto cycle を 3 スロット前提の探索フローに寄せる

備考:
このフェーズは Phase 1 から Phase 4 のあとに着手する。
先に UX を触ると再分解が二重作業になりやすい。

## Phase 6: テストと検証

最低限追加したいもの:

* Python
* prompt 合成
* artist 正規化
* favorites 正規化
* favorites 永続化
* JavaScript
* slot state 純関数
* favorites key 生成
* search/filter の整形ロジック

手動確認項目:

* ノード生成直後に button / tag 表示が崩れない
* graph 再読込後もノードサイズが破綻しない
* Style Browser から 3 スロット投入が期待通り動く
* Auto Cycle が queue 終了に追従する
* ローカル favorites が再起動後も保持される

## 推奨する着手順

1. Phase 1 で不要な旧 remote 連携を中心導線から外す
2. Phase 2 で Python service/store 化を進める
3. Phase 3 で 3 スロット挙動をドメイン化する
4. Phase 4 で browser 状態管理を解体する
5. Phase 5 で検索と操作体験を改善する
6. Phase 6 で回帰防止を入れる

## 補足

`nodes.py` 自体は小さいため、最初に触るべき本丸ではない。
このリファクタリングの主対象は「周辺機能の構造整理」であり、特に `routes.py` / `artist_data.py` / `js/index.js` / `js/browser.js` が中心になる。
