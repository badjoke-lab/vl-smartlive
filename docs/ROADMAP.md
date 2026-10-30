# VL SmartLive / ViewLoom — 正式開発ロードマップ（2026-10-30 改訂）

> **Status: ADOPTED / authoritative execution plan after merge to main**  
> 対象: OBS Bridge / PC Standalone / Web Console / Android Mobile  
> 基準: main `1135d271c1167f817339b1d3a59981e972588957`（2026-05-24最終更新）  
> 文書改訂: 2026-10-30。**この文書への採用は開発・実機検証の完了を意味しない。**

## 0. 決定・目的・適用範囲

本書は2026-05-20作成の「SmartLive Encoder 開発ロードマップ仕様書」および共通仕様、OBS Bridge v0.1実装仕様、PC Standalone、スマホ、Web Console仕様に基づく**実装再開用の最新版**である。古いPhase 0–8は「試作開始の順序」として残し、本書のG0–G9ゲートを**2026-10-30以降の実行順・進捗判定の正本**とする。旧計画にあった項目を無断で完成扱いにしない。

- **製品戦略:** 1 Android（本命）、2 PC Standalone、3 OBS Bridge、4 Web Console。**開発の先頭はOBS Bridge**である。
- **役割:** OBS BridgeはOBSの状態監視・コメント管理（OBSへの操作・自前送信なし）。PC StandaloneはOBS不要のPCエンコーダー。Web Consoleは配信前診断と配信後ログ分析（Web配信なし）。Androidはカメラ・マイクを使う単体配信アプリ。Mobile Web/PWAはAndroid APKの代替ではない。
- **横断要件:** コメント常時表示、Raw/Radar、危険コメントの自動読み上げ保留、ローカルログ、Markdown/JSONレポート、秘密情報を出さない。
- **制約:** 開発・運営予算ゼロ。購入が必要なAPI、常駐クラウド、DB、コード署名、ストア配布、決済、課金機構、外部AI APIを前提としない。既存の無料OSSを活用。GitHubが正本。
- **進め方:** `docs/*`で仕様管理、`feature/*`/`fix/*`で小単位PR、mainへの直接push禁止。自動CIと手元のOBS/Windows/Android実機検証を別ゲートにする。実機依存部分は実機の検証ログがない限り未検証。
- **配信サービス:** 初回のリアルコメント連携は公式に許容されたAPIで1サービスずつ実装・検証。優先候補YouTube Live、次いでTwitch。認証、権限、API制限、規約を事前検証し、サンプル表示をリアル受信と表示しない。配信送信先のRTMP接続とコメントAPI接続は別物。
- **版:** 元仕様のv0.1→v0.2→v0.3→v1.0を保持。v0.1のモック検証は許容するが、**製品v1.0の本番コメント機能は実受信であること**。段階的なロールアウトは許容するが4版のv1.0完成判定を混同しない。

## 1. 2026-10-30実装棚卸し（推測・実機確認なしの事実を区別）

| 領域 | 既存資産（main） | 残る欠落/リスク | 判定 |
|---|---|---|---|
| 基盤 | `packages/log-schema`, `comment-radar`, `report-engine`, サンプル | 実イベント・実保存・4版通貫の結合試験不足 | 基盤あり / 本番統合未検証 |
| OBS Bridge | `apps/obs-bridge` UI、`obs-real-client.ts`、Electron main/preload素案 | rendererの接続処理はmock/preview接続、Electronのdev/build/startは保留メッセージ、保存UIに実書込でなく件数見積あり | 未完成 |
| PC Standalone | `apps/pc-standalone` UI、キャプチャプレビュー、`server/transmitter.mjs`のFFmpeg処理、`scripts/serve-pc-standalone.mjs` | 現行UIから`/api/transmitter/*`呼出なし、通常の直配布は静的`portable-server.mjs`、送信成功の実機証拠なし。指標に固定サンプル | 未統合 |
| Web Console | `apps/console` JSON/JSONL表示・Raw/Radar風分析 | 配信前診断/設定メモ未実装、個別ファイル読込時に他ファイルがサンプルへ入れ替わり得る | 不完全 |
| Android | `apps/mobile-android`にRootEncoder使用のRTMP/RTMPS送信コード | 実機ビルド・接続確認なし、実コメント/Raw-Radar未接続、カメラ切替・ローカル永続化・配布APKなし | 本番未確認 |
| Mobile Web/PWA | `apps/mobile`のUI | 実ネイティブRTMP送信ではない（モック表示中心） | Android版と区別 |
| 配布・検証 | `release:direct`、4 ZIP、GitHub Actions CI/Release成功 | 配布物はNode.js要のローカルブラウザ版。CIは主にファイル存在・構文・画面文字列であり実配信試験ではない | プレビュー配布済み / 製品完成ではない |
| GitHub整理 | PR #33までmainにマージ、未マージ #20/#24 | #20/#24は古いベース・競合の可能性。単純マージ禁止 | 要整理 |

**注意すべき具体的な安全性調査:** `buildSafeReportExport`の配信URL保存、Android接続失敗reasonの画面・ログ表示、FFmpeg実行引数内の配信キー、localhost送信APIへの別サイト経由アクセス、URL/クエリ/例外文のsecret混入をレビューする。脆弱性と断定せず、**安全性未確認の出荷阻止ゲート**として扱う。

## 2. 成果物・合格判定の共通ルール

**Status:** `not-started` / `in-progress` / `code-complete` / `ci-pass` / `hardware-verified` / `released` / `blocked`。コードが存在するだけで`done`としない。

各実装PRは「対象画面の実際の挙動」「変更ファイル」「やらないこと」「自動テストと手動再現手順」「エラー系」「セキュリティ」「実機が必要なら未検証と明記」を記載。実装PRに対して1つ以上の再現可能な自動テストを要求する（ハードウェア固有部分は手動証拠を追加）。

**証拠の保存場所（新規運用）:** `docs/evidence/<gate>/<edition>.md`。記載内容は検証日時、OS/アプリ/端末/OBS/FFmpeg/Androidバージョン、使用した配信先種別、操作と期待値/実測、スクリーンショット/匿名化ログのURL、失敗内容、確認者、commit SHA。パスワード・配信キー・OAuthトークン・フル配信URLは厳禁。テスト未実施なら`NOT TESTED`。

**出荷共通条件:** 再現できる起動、成功/失敗を偽らない状態表示、配信開始→配信→停止（該当版）、コメントと安全な保留、保存→再読込→レポート、通信断/権限拒否/入力不正時の安全な状態遷移、秘密情報の非保存、README/無料配布手順、実機実証。模擬データしか使えない機能は`DEMO`を明示。

## 3. 実行ゲート（順番を固定し、前段ゲート未達なら次を完了にしない）

| Gate / 対応旧Phase | 作業 | 主要PR候補（1行=原則別PR） | Exit / 客観的証拠 |
|---|---|---|---|
| **G0 基準復旧**（旧0–2棚卸し） | 既存UIと配布物/branchを検証し、実装済・mock・未接続を区別 | R00 開発環境・CI監査、R01 #20/#24の差分判定、R02 DEMO/REALラベルとエラー表示監査 | clean checkoutでcheck、直配布起動、エラー/画面遷移を記録。未マージPRはmerge/close理由を記録 |
| **G1 共通コア**（旧1復旧） | 実ログ・Radar・レポートの正本化、安全なローカル永続化 | C01 schema/version/fixtures、C02 classification+TTS queue、C03 atomic append/recovery、C04 report from actual event stream、C05 secret redaction/security tests | フィクスチャ→受信→分類→保存→再読込→MD/JSON一致。欠損/破損JSONLを処理し再起動後復元。秘密情報漏出0 |
| **G2 OBS Bridge実接続**（旧3） | Electron起動と実OBS状態接続、read-only維持 | O01 Electron start/build + preload IPC、O02 real obs-websocket wiring、O03 connection/reconnect and truthful metrics、O04 local save / safe report | Windowsで起動、OBS WebSocket認証成功/失敗、scene/stream state/CPU/FPS/drop取得、停止/接続断復帰、ファイル再読込の手動証拠 |
| **G3 実コメントとOBS Bridge実用化**（旧4） | 1つの配信先から実チャット取得しRaw/Radarに通す。TTS・検索・固定・対応済み・アラート | L01 provider auth/adapter、L02 live queue + dedup/reconnect、L03 radar/held actions & TTS、O05 audio meter/alert timeline/layout、O06 Web互換 | 実コメント受信証拠。質問・音声指摘・危険URLの分類、保留コメントが自動読上げされない、ログ・レポート一致。OBSへの開始/停止操作なし |
| **G4 OBS Bridge v1.0判定** | 初の実用版のWindowsでのE2Eと配布 | O07 Windows package + smoke/hardware QA、O08 documented release | OBS+コメント→分類→警告→終了→保存→再表示まで1セッションの実測。起動可能ZIP、known issues、再現手順。満たさなければv1.0タグ禁止 |
| **G5 PC Standalone**（旧5） | 自前PC送信機能をUIに統合しv0.1→v0.3→v1.0 | P01 input capture + desktop audio/mic mixing、P02 MediaRecorder/FFmpeg H.264+AAC/RTMP pipeline、P03 UI to local API + CORS/CSRF/Host security、P04 actual metrics/state/restart/recovery、P05 shared comments/log/report、P06 packaging + Windows E2E | OBSなしで「画面・ゲーム/窓・カメラ・マイク/PC音声」選択→プレビュー→送信先接続→映像音声受信→停止。失敗の明確表示、実メトリクス、再起動後ログ。送信キー漏出0 |
| **G6 Web Console**（旧6） | 配信前診断と4版ファイル解析の完成 | W01 input/speed/quality rule engine、W02 app-specific setup memo、W03 safe multi-file session import/schema validator、W04 report/Radar/history/comparison、W05 ViewLoom navigation/static deployment | 条件別推奨結果の単体テスト、メモコピー、実際のOBS/PCログを混同せず取込、破損入力警告、オフライン動作確認。配信/秘密情報のアップロード不要 |
| **G7 Android Mobile**（旧7） | ネイティブ配信を完成し実コメント/ログに統合 | A01 Gradle/dependency reproducible build + permissions、A02 camera front/back/portrait/landscape/audio/quality、A03 RTMP(S) start/stop/live/error/reconnect、A04 source-appropriate live comments + Raw/Radar/TTS queue、A05 network/battery/audio/alerts、A06 durable logs/reports/Android UI、A07 APK distribution | Android実機で許可→プレビュー→前後切替→縦/横→RTMP映像音声→コメント→通信断/復帰→停止→ローカルレポート→再起動復元。署名済みAPKは無料の開発者鍵で生成可能か方針確認、ストア不要 |
| **G8 4版統合・品質**（旧8） | 本番相当の安定性/安全/互換検証 | Q01 integration matrix、Q02 soak/load/permission/disconnect tests、Q03 security/dependency review、Q04 UI a11y/mobile/English-Japanese check | 1つの実配信ログをWebで読める。4版共通スキーマ契約一致。30分連続配信（各送信版）、長時間試験・再接続/再起動/容量不足/無権限の試験結果記録。未対応はissueへ |
| **G9 正式配布**（旧8） | バージョン/説明/リリース証拠の固定 | REL01 version/CHANGELOG/compatibility、REL02 Windows ZIP + Android APK + Web static deploy、REL03 smoke/signatures/checksums/rollback | 各版独立のv1.0チェックリスト全Passと手動証拠。配布物の再インストール検証、SHA256、不要secret混入0。4版全部の正式完了判定 |

**Gate間の依存関係:** G0→G1→G2→G3→G4→G5→G6→G7→G8→G9。G5以降の独立した準備・静的UI作業は並行可。ただし各ゲートのExit合格を飛ばして**正式版と宣言しない**。Android実機テストはG7まで待たず、早い段階でビルド環境・カメラ送信可否のリスク検証を行う。

## 4. 4版の操作シナリオと具体的な完成条件

### OBS Bridge（Windows優先・OBS read-only）

1. 初回起動→OBS WebSocket（host/port/password）入力→接続中→実接続成立表示。誤パスワード/OBS停止時は接続済に見せない。
2. OBSのシーン名・配信/録画状態・CPU/FPS/Drop等を実取得。配信開始/停止はOBSでのみ行う。取得できない項目は`not available`で代替し捏造しない。
3. コメント取得サービスを選択・認証。Rawは受信順、Radarは質問/音声/映像/危険/盛上り等。長文/URL/個人情報候補は読み上げ保留、固定/対応済/ミュート等の操作はログに反映。
4. OBS切断・コメントAPI停止・アプリ異常終了で状態とログを保存。再接続できても過去イベントを勝手に捏造しない。
5. 配信終了→session/comments/alerts/stream-state→Markdown/JSONレポート、Web Consoleに読ませ同じ数値を再現。ZIPをクリーンWindowsで起動。

**v0.1のモックコメントは開発用の明示表示に限定し、v1.0の日常利用シナリオはリアルコメント受信を合格条件とする。**

### PC Standalone（Windows優先・自前送信）

1. 出力先（YouTube/Twitch/Custom RTMP）、画面/ゲーム窓/カメラ、マイク/システム音、H.264/AAC・解像度/FPS/Bitrateを指定。無権限デバイスは開始不可。
2. 実プレビューと音声メーターを確認→Start→FFmpeg送信→RTMP(S)受信先で映像・音声が見えることを確認。`ffmpeg spawned`だけで`LIVE`としない。
3. 実FPS/CPU/Drop/送信ビットレートを更新。送信失敗・入力切断・権限拒否を別の状態で表す。画面切替やコメント操作中に意図せず配信停止しない。
4. コメントのリアル受信、Raw/Radar、TTS/保留、ログ記録。Stop→プロセス/端末リソースの確実な終了、ログ確定、再読込とレポート確認。
5. 直配布の`portable-server.mjs`と`serve-pc-standalone.mjs`の違いを解消し、**ユーザー配布物が実送信できる**ことをインストール後に検証。

### Web Console（静的ブラウザ・RTMP非対応）

1. 配信先/コンテンツ種別/アップロード速度/端末性能/安定優先度を入力→条件を明示した解像度/FPS/ビットレート推奨。誤入力・回線余裕不足は警告。
2. OBS/Standalone/Android用設定メモを生成・コピー。端末とプラットフォームによる制限、測定ではなく入力に基づく推奨である旨を表示。
3. 6つの共通セッションファイルを選択/ドラッグしてまとめて読み込む。**1ファイルの差し替えで他のファイルをサンプルに戻さない**。欠損・schema差・混在ソースは明示。
4. コメントRaw/Radar・アラート時系列・レポートを表示。複数セッション比較は元仕様v0.3で扱う。機密情報をサーバー送信せずローカル処理。
5. 各アプリのダウンロード/説明ページへ案内。静的サイトの閲覧・ローカル処理が完結する。

### Android Mobile（戦略本命・APK）

1. 権限要求→実カメラプレビュー/音声メーター、前面/背面、縦/横、解像度/FPS/Bitrateを選択。
2. RTMP(S)配信キー入力（ランタイムのみ）→開始→送信先で映像/音声を確認。接続エラーはキー・フルURLを伏せて表示。
3. 配信を継続しながらコメントを常時見せる。Raw/Radar、保留/固定/読み上げ、片手操作、画面狭小時レイアウトを検証。
4. 回線断/切替、電池低下、マイク無音、送信エラーで適切な警告。無断の自動画質変更を行わず、元仕様の「安定化提案」を実装。
5. Stop→session/コメント/アラート/配信状態/レポートを端末内に保存→共有→Web Consoleで再読込。アプリ再起動後も履歴を維持。
6. Android署名付き無料APKを作成し、GitHub Releasesからダウンロード→新規インストール→配信まで検証。Mobile Web版ZIPをAPKと呼ばない。

## 5. 優先度付き・旧不足26項目との対応

| 対象不足ID（2026-10-30監査） | 処理ゲート | 必須の判定 |
|---|---|---|
| 1 OBS接続、2 Electron | G2/G4 | 実機OBS接続・起動可能アプリ |
| 3 実コメント、4分類、5読み上げ | G1/G3/G5/G7 | 受信→分類→保留→操作→保存の一連動作 |
| 6ログ、7レポート | G1、各版G4/G5/G7 | 実データ保存と再読込結果一致 |
| 8 PC実配信、9実メトリクス | G5 | 映像音声の実送信・実値表示 |
| 10 Android撮影/設定、11監視、12コメント、13ログ | G7 | Android実機1セッション完了 |
| 14 Web診断、15設定メモ、16ファイル読み込み | G6 | 入力別結果・互換/不正時テスト |
| 17共通スキーマ、18UI | G1/G8 | 4版互換、表示/操作テスト |
| 19安全、20実配信試験、21安定性 | G1/G4/G5/G7/G8 | シークレット非漏出、接続断、連続配信 |
| 22 Windows、23 Android APK | G4/G5/G7/G9 | クリーン実機で配布物起動 |
| 24 自動テスト、25 リリース | G0/G8/G9 | 適切なCI + 正式成果物 |
| 26 旧PR整理 | G0 | #20/#24の採否・close理由確定 |

## 6. PR/Issue運用と進捗更新

- 本書はロードマップの正本。実装Issueは**R/C/O/L/P/W/A/Q/RELのID**を付け、小さいPR単位に分割する。Issue本文は「目的・やること・やらないこと・対象・テスト・実機要否・合格条件・依存Gate」を含める。
- ラベルは元の運用仕様（`feature`、`bug`、`docs`、`remote-ok`、`local-check-required`、`obs-check-required`、`android-check-required`、`release`、`blocked`）を使用。存在しないラベルは作成する。
- **次に実装する1本目はG0/R00**: clean checkoutの実行、CI構成、既存配布物の起動と「実機でないと分からない点」を実測表にする。その後G0/R01とG1/C01から順に着手。G0の文書化のみでG1を完了としない。
- `docs/ROADMAP.md`のGate表は各Gate終了時に更新し、証拠URLとcommit、最終判定を書き込む。CI緑だけでステータスを`hardware-verified`に上げない。
- Release前に配信プラットフォームAPI利用規約、OSSライセンス、再配布物同梱物を確認。費用が生じる方式しかなければ勝手に有料化せず`blocked`として代替案を提出する。
- 旧`v0.1.0-direct`/`v0.1.0-source`は**プレビューバンドル**として残す。新たな`v1.0`リリースと混同しない。

## 7. 直近の着手順（これ以外の機能追加を先行させない）

1. **R00:** 4版起動・UI・配布物の現状と現行CIの検証表を作る。`DEMO`と`REAL`の誤表示を洗い出す。
2. **R01:** PR #20/#24は最新mainとの差分と既存マージ機能を照合し、採用/廃止を決める。
3. **C05:** キー露出、URL保存、Androidエラー、FFmpeg引数、localhost APIをセキュリティ監査しテストを追加する。
4. **O01:** OBS Bridge Electron実ビルド・Windows起動経路を復旧する。
5. **O02:** 画面の擬似「connected」を`obs-real-client.ts`の実接続へ置換し、実OBSで状態取得を証明する。
6. **C03/O04:** session/コメント/alert/stream-stateの**実ファイル保存**を証明する。プランと保存実行の混同をなくす。
7. **L01:** YouTube等、許容された最初のリアルコメントアダプターを実装し、受信証拠を残す。

最優先は「見た目」でも「4版同時リライト」でもなく、**既存コードを本物のイベント・送信・保存へつなぐこと**。

## 8. 完成の宣言と更新手続き

- 各GateにはExit証拠が必要。証拠がなければ`in-progress`または`blocked`。
- **4版すべてのv1.0**は、G4/G5/G6/G7の機能完了に加えG8/G9を満たした時だけ宣言する。
- 方針を変える場合は別PRで本書の理由、影響範囲、変えない事項、検証方法を記す。元仕様の変更を無断で既成事実化しない。
- 本書は実装状況の監査に基づく工程表であり、将来の作業完了、リリース日、収益を保証しない。

## 9. 根拠資料

2026-05-20付の保存済みSmartLive Encoder各種仕様書（開発ロードマップ、共通仕様、開発方式・リポジトリ運用、OBS Bridge v0.1、PC Standalone、スマホアプリ、Web Console、4版位置づけ）をベースとした。これらは2026-10-30時点でGitHub内に存在しないため、**原本の参照が可能な作業環境での照合が必要**。実装についてはmain `1135d271...`、`docs/known-issues.md`、現行の`apps/`・`packages/`・`scripts/`とGitHub Actions履歴を参照した。
