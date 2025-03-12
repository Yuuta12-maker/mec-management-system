# マインドエンジニアリング・コーチング業務管理システムのアーキテクチャ

このドキュメントでは、マインドエンジニアリング・コーチング業務管理システムのアーキテクチャを説明します。

## システム構成図

```mermaid
flowchart TB
    subgraph 顧客導線
    WebForm["Google Forms<br>(申込フォーム)"]
    Website["ウェブサイト<br>(GitHub Pages)"]
    end
    
    subgraph GAS基幹システム
    FormScript["GAS<br>(フォーム処理)"]
    SheetDB["Google Sheets<br>(クライアントDB)"]
    CalScript["GAS<br>(カレンダー管理)"]
    MailScript["GAS<br>(メール自動化)"]
    DocScript["GAS<br>(ドキュメント処理)"]
    Dashboard["GASウェブアプリ<br>(管理ダッシュボード)"]
    end
    
    subgraph Googleサービス
    Calendar["Google Calendar<br>(セッション予約)"]
    Meet["Google Meet<br>(オンラインセッション)"]
    Gmail["Gmail<br>(クライアントコミュニケーション)"]
    Drive["Google Drive<br>(セッション記録・契約書保管)"]
    end
    
    subgraph 外部連携
    PaymentService["決済サービス<br>(Stripe等)"]
    end
    
    %% 接続関係
    WebForm --> FormScript
    Website --> WebForm
    
    FormScript --> SheetDB
    FormScript --> MailScript
    FormScript --> CalScript
    SheetDB <--> Dashboard
    
    CalScript --> Calendar
    Calendar --> Meet
    MailScript --> Gmail
    DocScript --> Drive
    DocScript <--> SheetDB
    
    Dashboard --> DocScript
    Dashboard --> MailScript
    Dashboard --> CalScript
    
    SheetDB <-.-> PaymentService
```

## コンポーネント説明

### 顧客導線

1. **ウェブサイト (GitHub Pages)**: マインドエンジニアリング・コーチングの情報提供と申込フォームへの導線
2. **Google Forms (申込フォーム)**: クライアントからの申込情報を収集

### GAS基幹システム

1. **フォーム処理スクリプト**: フォーム送信を処理し、データベースに登録
2. **Google Sheets (クライアントDB)**: クライアント情報、セッション予約、支払い情報を管理
3. **カレンダー管理スクリプト**: Google Calendarとの連携、セッション予約管理
4. **メール自動化スクリプト**: 自動メール送信（リマインダー、フォローアップなど）
5. **ドキュメント処理スクリプト**: 契約書などの文書生成と管理
6. **管理ダッシュボード**: コーチがクライアント管理、セッション予約などを行うためのウェブアプリケーション

### Googleサービス連携

1. **Google Calendar**: セッションのスケジュール管理
2. **Google Meet**: オンラインセッションのビデオ会議
3. **Gmail**: クライアントとのコミュニケーション
4. **Google Drive**: セッション記録と契約書の保管

### 外部サービス連携

1. **決済サービス**: 支払い処理（将来的な拡張）

## データフロー

1. クライアントがウェブサイトを訪問し、申込フォームに記入
2. フォームデータがGASスクリプトによって処理され、Google Sheetsに保存
3. 自動メールがクライアントに送信され、初回トライアルセッションの案内
4. 管理ダッシュボードでコーチがクライアント情報を確認
5. セッション予約が確定すると、Google Calendarに登録され、Google Meetリンクが生成
6. セッション前にリマインダーメールが自動送信
7. セッション実施後、コーチが記録を入力し、次回セッションのフォローアップ

## 主要処理のワークフロー

### 新規クライアント登録プロセス

```mermaid
sequenceDiagram
    participant Client as クライアント
    participant Form as Google Forms
    participant GAS as GASスクリプト
    participant DB as Google Sheets
    participant Mail as Gmail
    participant Coach as コーチ
    
    Client->>Form: 申込フォーム入力
    Form->>GAS: フォーム送信
    GAS->>DB: クライアント情報登録
    GAS->>Mail: 自動返信メール送信
    Mail->>Client: 申込確認メール受信
    GAS->>Mail: 通知メール送信
    Mail->>Coach: 新規申込通知
    Coach->>DB: 申込内容確認
    Coach->>Client: 初回セッション日程調整
```

### セッション予約・リマインダープロセス

```mermaid
sequenceDiagram
    participant Coach as コーチ
    participant Dashboard as 管理ダッシュボード
    participant DB as Google Sheets
    participant Calendar as Google Calendar
    participant Meet as Google Meet
    participant Mail as Gmail
    participant Client as クライアント
    
    Coach->>Dashboard: セッション予約登録
    Dashboard->>DB: セッション情報保存
    Dashboard->>Calendar: カレンダー登録
    Calendar->>Meet: ミーティングリンク生成
    Dashboard->>Mail: 予約確認メール送信
    Mail->>Client: 予約確認受信
    
    Note over Dashboard,Mail: セッション前日
    Dashboard->>Mail: リマインダー送信
    Mail->>Client: リマインダー受信
```

## データベース構造

Google Sheetsを使用したデータベース構造については、`database-structure.md`ファイルを参照してください。