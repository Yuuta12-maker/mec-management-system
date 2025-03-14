# マインドエンジニアリング・コーチング業務管理システム

![コーポレートカラー](https://img.shields.io/badge/Corporate%20Color-%23c50502-c50502)

## 概要

本リポジトリは、マインドエンジニアリング・コーチングの業務管理を効率化するためのGoogle Apps Script（GAS）ベースの統合管理システムです。クライアント管理、セッション予約、支払い追跡などの機能を備えています。

## 特徴

- **ダッシュボード**: 重要なメトリクスとタスクを一目で確認
- **クライアント管理**: クライアント情報の包括的な管理
- **セッション管理**: 予約、リマインダー、セッション記録
- **支払い追跡**: 支払い状況の管理と請求書発行
- **自動メール配信**: リマインダーやフォローアップの自動送信
- **レポート機能**: 各種データの可視化と分析

## システム構成

このシステムは以下のコンポーネントで構成されています：

1. **Google Sheets**: データベースとして機能
2. **Google Apps Script**: バックエンドロジックとAPIハンドリング
3. **HTML/CSS/JavaScript**: フロントエンドインターフェース
4. **Google Calendar**: セッション予約の管理
5. **Gmail**: 自動メール送信

## データ構造

システムは以下のデータテーブル（Googleシート）を使用します：

- **クライアントinfo**: クライアントの基本情報
- **セッション管理**: セッション予約と実施記録
- **支払い管理**: 支払い状況と履歴
- **メールログ**: 送信メールの記録
- **設定**: システム設定値

## 導入方法

1. Google Driveにスプレッドシートを作成
2. [clasp](https://github.com/google/clasp)を使用してこのリポジトリのコードをGoogle Apps Scriptプロジェクトにプッシュ
3. 必要なスプレッドシートの構造とSheetオブジェクトを初期化
4. アクセス権限を設定し、デプロイ

## 使用技術

- Google Apps Script
- HTML5
- CSS3
- JavaScript
- Google Workspace API

## 開発者情報

- 開発者: 森山雄太
- 連絡先: mindengineeringcoaching@gmail.com

## ライセンス

このプロジェクトは独自のライセンスの下で公開されています。
