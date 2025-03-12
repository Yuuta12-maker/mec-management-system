/**
 * マインドエンジニアリング・コーチング管理システム
 * メインエントリーポイント
 */

// ウェブアプリケーションのエントリーポイント
function doGet() {
  try {
    return HtmlService.createTemplateFromFile('Dashboard')
      .evaluate()
      .setTitle('マインドエンジニアリング・コーチング 管理ダッシュボード')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return HtmlService.createHtmlOutput('<h1>エラーが発生しました</h1><p>管理者にお問い合わせください。</p>');
  }
}

// HTMLインクルード関数
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    Logger.log('Error in include: ' + error.toString());
    return '<!-- ファイル読み込みエラー -->';
  }
}

/**
 * ダッシュボード用データを取得する関数
 * クライアント側から呼び出されるメイン関数
 */
function getDashboardData() {
  try {
    // 各種データを集約
    return {
      summary: getSummaryData(),
      upcomingSessions: getUpcomingSessions(5), // 直近5件
      pendingTasks: getPendingTasks(),
      clients: getClientsList(),
      weeklySchedule: getWeeklySchedule(14) // 今後2週間
    };
  } catch (error) {
    Logger.log('Error in getDashboardData: ' + error.toString());
    // エラーの詳細情報は内部ログのみに記録し、クライアントには最小限の情報だけを返す
    return {
      error: "データ取得中にエラーが発生しました。管理者にお問い合わせください。"
    };
  }
}

/**
 * サマリーデータを取得
 * クライアント数、セッション数、収益などの集計
 */
function getSummaryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // クライアント情報を取得
  const clientSheet = ss.getSheetByName('クライアントinfo');
  const clientData = clientSheet ? getSheetData(clientSheet) : [];
  
  // セッション情報を取得
  const sessionSheet = ss.getSheetByName('セッション管理');
  const sessionData = sessionSheet ? getSheetData(sessionSheet) : [];
  
  // 支払い情報を取得
  const paymentSheet = ss.getSheetByName('支払い管理');
  const paymentData = paymentSheet ? getSheetData(paymentSheet) : [];
  
  // 集計処理
  const today = new Date();
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay()); // 今週の日曜日
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // クライアント集計
  const totalClients = clientData.length;
  
  // ステージ別クライアント数を集計する処理を実装予定
  const trialClients = clientData.filter(client => 
    client.ステータス === 'トライアル' || client.ステータス === 'トライアル済み'
  ).length;
  
  const contractedClients = clientData.filter(client => 
    client.ステータス === '継続中' || client.ステータス === '継続セッション待ち'
  ).length;
  
  // セッション集計
  const upcomingSessions = sessionData.filter(session => {
    if (!session.予定日時) return false;
    try {
      const sessionDate = new Date(session.予定日時);
      return sessionDate >= today;
    } catch (e) {
      return false;
    }
  }).length;
  
  // 今週のセッション数を集計
  const thisWeekSessions = sessionData.filter(session => {
    if (!session.予定日時) return false;
    try {
      const sessionDate = new Date(session.予定日時);
      return sessionDate >= thisWeekStart && sessionDate < new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    } catch (e) {
      return false;
    }
  }).length;
  
  // 今月のセッション数を集計
  const thisMonthSessions = sessionData.filter(session => {
    if (!session.予定日時) return false;
    try {
      const sessionDate = new Date(session.予定日時);
      const nextMonthStart = new Date(thisMonthStart);
      nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
      return sessionDate >= thisMonthStart && sessionDate < nextMonthStart;
    } catch (e) {
      return false;
    }
  }).length;
  
  // 収益集計
  const totalRevenue = paymentData.reduce((sum, payment) => {
    return sum + (payment.状態 === '入金済み' ? Number(payment.金額) || 0 : 0);
  }, 0);
  
  const pendingRevenue = paymentData.reduce((sum, payment) => {
    return sum + (payment.状態 === '未入金' ? Number(payment.金額) || 0 : 0);
  }, 0);
  
  // 収益を万円単位で返す
  const formatRevenue = (amount) => Math.floor(amount / 10000);
  
  return {
    clients: {
      total: totalClients,
      trial: trialClients,
      contracted: contractedClients
    },
    sessions: {
      upcoming: upcomingSessions,
      thisWeek: thisWeekSessions,
      thisMonth: thisMonthSessions
    },
    revenue: {
      total: formatRevenue(totalRevenue),
      received: formatRevenue(totalRevenue - pendingRevenue),
      pending: formatRevenue(pendingRevenue)
    }
  };
}

/**
 * 直近のセッション情報を取得
 * @param {number} limit - 取得件数
 */
function getUpcomingSessions(limit) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionSheet = ss.getSheetByName('セッション管理');
  
  if (!sessionSheet) return [];
  
  const sessionData = getSheetData(sessionSheet);
  const clientSheet = ss.getSheetByName('クライアントinfo');
  const clientData = clientSheet ? getSheetData(clientSheet) : [];
  
  // クライアントIDからクライアント名を取得するマップを作成
  const clientMap = {};
  clientData.forEach(client => {
    clientMap[client.クライアントID] = client.お名前;
  });
  
  // 今日以降のセッションをフィルタリング
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingSessions = sessionData
    .filter(session => {
      if (!session.予定日時) return false;
      try {
        const sessionDate = new Date(session.予定日時);
        return sessionDate >= today && session.ステータス !== '完了';
      } catch (e) {
        return false;
      }
    })
    .sort((a, b) => {
      try {
        return new Date(a.予定日時) - new Date(b.予定日時);
      } catch (e) {
        return 0;
      }
    })
    .slice(0, limit)
    .map(session => {
      try {
        const sessionDate = new Date(session.予定日時);
        
        // 日付フォーマット（例：4/15）
        const dateStr = `${sessionDate.getMonth() + 1}/${sessionDate.getDate()}`;
        
        // 時間フォーマット（例：13:00）
        const timeStr = sessionDate.toTimeString().substring(0, 5);
        
        // 明日かどうか
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
        
        let displayDate = dateStr;
        if (sessionDate >= today && sessionDate < tomorrow) {
          displayDate = '今日';
        } else if (sessionDate >= tomorrow && sessionDate < dayAfterTomorrow) {
          displayDate = '明日';
        }
        
        return {
          id: session.セッションID,
          clientId: session.クライアントID,
          clientName: clientMap[session.クライアントID] || '不明',
          type: session.セッション種別,
          sessionNumber: session.セッション番号 || '',
          date: displayDate,
          time: timeStr,
          format: session.Google_Meet_URL ? 'オンライン' : '対面',
          meetUrl: session.Google_Meet_URL || '',
          isHighlighted: sessionDate < dayAfterTomorrow // 今日か明日のセッションは強調表示
        };
      } catch (e) {
        Logger.log('Session date error: ' + e.toString());
        return null;
      }
    })
    .filter(item => item !== null);
  
  return upcomingSessions;
}

/**
 * 対応が必要なタスクを取得
 */
function getPendingTasks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // クライアント情報を取得
  const clientSheet = ss.getSheetByName('クライアントinfo');
  const clientData = clientSheet ? getSheetData(clientSheet) : [];
  
  // セッション情報を取得
  const sessionSheet = ss.getSheetByName('セッション管理');
  const sessionData = sessionSheet ? getSheetData(sessionSheet) : [];
  
  // 支払い情報を取得
  const paymentSheet = ss.getSheetByName('支払い管理');
  const paymentData = paymentSheet ? getSheetData(paymentSheet) : [];
  
  const tasks = [];
  
  // 新規申込対応
  const newApplicants = clientData.filter(client => {
    // 例：申込日が最近で、トライアルが未設定のクライアント
    return client.ステータス === '新規申込' || !client.ステータス;
  });
  
  if (newApplicants.length > 0) {
    tasks.push({
      type: 'new_applicants',
      title: '新規申込対応',
      count: newApplicants.length,
      icon: 'user-plus',
      iconType: 'warning',
      clients: newApplicants.map(client => ({
        id: client.クライアントID,
        name: client.お名前
      }))
    });
  }
  
  // 日程調整が必要なクライアント
  const needScheduling = clientData.filter(client => {
    // 例：トライアル済みだが、次回セッションが未設定のクライアント
    return client.ステータス === 'トライアル済み' || client.ステータス === '継続セッション待ち';
  });
  
  if (needScheduling.length > 0) {
    tasks.push({
      type: 'scheduling',
      title: '日程調整が必要',
      count: needScheduling.length,
      icon: 'calendar-alt',
      iconType: 'alert',
      clients: needScheduling.map(client => ({
        id: client.クライアントID,
        name: client.お名前,
        stage: client.ステータス
      }))
    });
  }
  
  // 支払い確認が必要
  const pendingPayments = paymentData.filter(payment => {
    return payment.状態 === '未入金' || payment.状態 === '確認待ち';
  });
  
  if (pendingPayments.length > 0) {
    // クライアントIDからクライアント名を取得するマップを作成
    const clientMap = {};
    clientData.forEach(client => {
      clientMap[client.クライアントID] = client.お名前;
    });
    
    tasks.push({
      type: 'payment',
      title: '支払い確認',
      count: pendingPayments.length,
      icon: 'yen-sign',
      iconType: 'warning',
      clients: pendingPayments.map(payment => ({
        id: payment.クライアントID,
        name: clientMap[payment.クライアントID] || '不明',
        amount: payment.金額,
        item: payment.項目
      }))
    });
  }
  
  // リマインダー送信が必要なセッション
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  
  const needReminder = sessionData.filter(session => {
    if (!session.予定日時) return false;
    try {
      const sessionDate = new Date(session.予定日時);
      // 明日のセッションで、リマインダー未送信のもの
      return sessionDate <= tomorrow && 
             sessionDate > today && 
             session.ステータス !== '完了' && 
             session.リマインダー !== '送信済み';
    } catch (e) {
      return false;
    }
  });
  
  if (needReminder.length > 0) {
    // クライアントIDからクライアント名を取得するマップを作成
    const clientMap = {};
    clientData.forEach(client => {
      clientMap[client.クライアントID] = client.お名前;
    });
    
    tasks.push({
      type: 'reminder',
      title: 'リマインダー送信',
      count: needReminder.length,
      icon: 'envelope',
      iconType: 'info',
      sessions: needReminder.map(session => ({
        id: session.セッションID,
        clientId: session.クライアントID,
        clientName: clientMap[session.クライアントID] || '不明',
        type: session.セッション種別,
        sessionNumber: session.セッション番号 || '',
        dateTime: new Date(session.予定日時).toLocaleString('ja-JP')
      }))
    });
  }
  
  return tasks;
}

/**
 * クライアント一覧を取得
 */
function getClientsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clientSheet = ss.getSheetByName('クライアントinfo');
  
  if (!clientSheet) return [];
  
  const clientData = getSheetData(clientSheet);
  const sessionSheet = ss.getSheetByName('セッション管理');
  const sessionData = sessionSheet ? getSheetData(sessionSheet) : [];
  const paymentSheet = ss.getSheetByName('支払い管理');
  const paymentData = paymentSheet ? getSheetData(paymentSheet) : [];
  
  // クライアントIDごとのセッション数をカウント
  const sessionCountMap = {};
  sessionData.forEach(session => {
    const clientId = session.クライアントID;
    if (!sessionCountMap[clientId]) {
      sessionCountMap[clientId] = 0;
    }
    if (session.ステータス === '完了') {
      sessionCountMap[clientId]++;
    }
  });
  
  // クライアントIDごとの次回セッション日を取得
  const nextSessionMap = {};
  const today = new Date();
  sessionData.forEach(session => {
    const clientId = session.クライアントID;
    if (!session.予定日時) return;
    
    try {
      const sessionDate = new Date(session.予定日時);
      if (sessionDate >= today && session.ステータス !== '完了') {
        if (!nextSessionMap[clientId] || new Date(nextSessionMap[clientId].date) > sessionDate) {
          nextSessionMap[clientId] = {
            date: sessionDate,
            formattedDate: sessionDate.toLocaleDateString('ja-JP'),
            formattedTime: sessionDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          };
        }
      }
    } catch (e) {
      // 日付解析エラーは無視
    }
  });
  
  // クライアントIDごとの支払い状況を取得
  const paymentStatusMap = {};
  paymentData.forEach(payment => {
    const clientId = payment.クライアントID;
    if (!paymentStatusMap[clientId]) {
      paymentStatusMap[clientId] = {
        hasPendingPayment: false,
        hasCompletedPayment: false
      };
    }
    if (payment.状態 === '入金済み') {
      paymentStatusMap[clientId].hasCompletedPayment = true;
    } else if (payment.状態 === '未入金' || payment.状態 === '確認待ち') {
      paymentStatusMap[clientId].hasPendingPayment = true;
    }
  });
  
  return clientData.map(client => {
    // ステージの決定
    let stage = 'new';
    let stageLabel = '新規';
    
    if (client.ステータス) {
      if (client.ステータス.includes('トライアル')) {
        stage = 'trial';
        stageLabel = 'トライアル';
      } else if (client.ステータス.includes('継続中') || client.ステータス.includes('セッション')) {
        stage = 'active';
        stageLabel = '継続中';
      } else if (client.ステータス.includes('完了')) {
        stage = 'completed';
        stageLabel = '完了';
      }
    }
    
    // 次回セッション情報
    const nextSession = nextSessionMap[client.クライアントID];
    const nextSessionStr = nextSession ? 
      `${nextSession.formattedDate} ${nextSession.formattedTime}` : 
      '未設定';
    
    // 支払い状況
    const paymentStatus = paymentStatusMap[client.クライアントID];
    let paymentStatusLabel = '未設定';
    let paymentStatusType = 'warning';
    
    if (paymentStatus) {
      if (paymentStatus.hasPendingPayment) {
        paymentStatusLabel = '未入金';
        paymentStatusType = 'warning';
      } else if (paymentStatus.hasCompletedPayment) {
        paymentStatusLabel = '入金済';
        paymentStatusType = 'success';
      }
    }
    
    // セッション進捗
    const completedSessions = sessionCountMap[client.クライアントID] || 0;
    const totalSessions = 6; // 全6回固定
    const progressPercentage = (completedSessions / totalSessions) * 100;
    
    return {
      id: client.クライアントID,
      name: client.お名前,
      stage: stage,
      stageLabel: stageLabel,
      nextSession: nextSessionStr,
      paymentStatus: paymentStatusLabel,
      paymentStatusType: paymentStatusType,
      progress: {
        completed: completedSessions,
        total: totalSessions,
        percentage: progressPercentage
      }
    };
  });
}

/**
 * 週間スケジュールを取得
 * @param {number} days - 取得する日数
 */
function getWeeklySchedule(days) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionSheet = ss.getSheetByName('セッション管理');
  
  if (!sessionSheet) return [];
  
  const sessionData = getSheetData(sessionSheet);
  const clientSheet = ss.getSheetByName('クライアントinfo');
  const clientData = clientSheet ? getSheetData(clientSheet) : [];
  
  // クライアントIDからクライアント名を取得するマップを作成
  const clientMap = {};
  clientData.forEach(client => {
    clientMap[client.クライアントID] = client.お名前;
  });
  
  // 今日から指定日数分の日付を生成
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dateMap = {};
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // キーを YYYY-MM-DD 形式で作成
    const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    // 曜日を取得
    const dayOfWeek = '日月火水木金土'[date.getDay()];
    
    dateMap[dateKey] = {
      date: date,
      display: `${date.getMonth() + 1}/${date.getDate()}（${dayOfWeek}）`,
      events: []
    };
  }
  
  // セッションデータを日付ごとに整理
  sessionData.forEach(session => {
    if (!session.予定日時) return;
    
    try {
      const sessionDate = new Date(session.予定日時);
      
      // セッション日が今日以降かつ取得範囲内かチェック
      if (sessionDate >= today) {
        const dateKey = `${sessionDate.getFullYear()}-${(sessionDate.getMonth() + 1).toString().padStart(2, '0')}-${sessionDate.getDate().toString().padStart(2, '0')}`;
        
        if (dateMap[dateKey]) {
          // 時間フォーマット（例：13:00）
          const timeStr = sessionDate.toTimeString().substring(0, 5);
          
          dateMap[dateKey].events.push({
            id: session.セッションID,
            clientId: session.クライアントID,
            clientName: clientMap[session.クライアントID] || '不明',
            type: session.セッション種別,
            sessionNumber: session.セッション番号 || '',
            time: timeStr,
            format: session.Google_Meet_URL ? 'オンライン' : '対面',
            meetUrl: session.Google_Meet_URL || ''
          });
        }
      }
    } catch (e) {
      // 日付変換エラーは無視
    }
  });
  
  // 日付順の配列に変換
  return Object.values(dateMap);
}

/**
 * セッション詳細情報を取得する
 * @param {string} sessionId - セッションID
 * @return {object} セッション詳細情報
 */
function getSessionDetails(sessionId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // セッション情報を取得
    const sessionSheet = ss.getSheetByName('セッション管理');
    if (!sessionSheet) {
      throw new Error('セッション管理シートが見つかりません');
    }
    
    const sessionData = getSheetData(sessionSheet);
    const session = sessionData.find(s => s.セッションID === sessionId);
    
    if (!session) {
      throw new Error('セッションが見つかりません');
    }
    
    // クライアント情報を取得
    const clientSheet = ss.getSheetByName('クライアントinfo');
    if (!clientSheet) {
      throw new Error('クライアント情報シートが見つかりません');
    }
    
    const clientData = getSheetData(clientSheet);
    const client = clientData.find(c => c.クライアントID === session.クライアントID);
    
    if (!client) {
      throw new Error('関連するクライアントが見つかりません');
    }
    
    // 日時のフォーマット
    let formattedDate = '';
    if (session.予定日時) {
      try {
        const sessionDate = new Date(session.予定日時);
        formattedDate = `${sessionDate.getFullYear()}年${sessionDate.getMonth() + 1}月${sessionDate.getDate()}日 ${sessionDate.getHours().toString().padStart(2, '0')}:${sessionDate.getMinutes().toString().padStart(2, '0')}`;
      } catch (e) {
        formattedDate = String(session.予定日時);
      }
    }
    
    return {
      id: session.セッションID,
      client: {
        id: client.クライアントID,
        name: client.お名前
      },
      type: session.セッション種別 || 'トライアル',
      date: formattedDate,
      format: session.Google_Meet_URL ? 'オンライン（Google Meet）' : '対面',
      meetUrl: session.Google_Meet_URL || '',
      status: session.ステータス || '予定',
      notes: session.記録 || '',
      reminderSent: session.リマインダー === '送信済み'
    };
  } catch (error) {
    Logger.log('Error in getSessionDetails: ' + error.toString());
    return {
      error: "セッション詳細の取得中にエラーが発生しました: " + error.message
    };
  }
}

/**
 * クライアント詳細情報を取得する
 * @param {string} clientId - クライアントID
 * @return {object} クライアント詳細情報
 */
function getClientDetails(clientId) {
  try {
    Logger.log("getClientDetails started for clientId: " + clientId);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('スプレッドシートが見つかりません');
    }
    
    // 基本情報を取得
    const clientSheet = ss.getSheetByName('クライアントinfo');
    if (!clientSheet) {
      throw new Error('クライアントinfoシートが見つかりません');
    }
    
    const clientData = getSheetData(clientSheet);
    Logger.log("クライアント数: " + clientData.length);
    
    const client = clientData.find(c => c.クライアントID === clientId);
    if (!client) {
      throw new Error('指定されたIDのクライアントが見つかりません: ' + clientId);
    }
    
    // セッション情報を取得
    const sessionSheet = ss.getSheetByName('セッション管理');
    const sessionData = sessionSheet ? getSheetData(sessionSheet) : [];
    
    // 支払い情報を取得
    const paymentSheet = ss.getSheetByName('支払い管理');
    const paymentData = paymentSheet ? getSheetData(paymentSheet) : [];
    
    // クライアントの次回セッションを取得
    const today = new Date();
    let nextSessionStr = '';
    
    // セッションをフィルタリング（エラー処理を追加）
    const upcomingSessions = sessionData.filter(s => {
      if (!s || !s.クライアントID || s.クライアントID !== clientId || !s.予定日時) {
        return false;
      }
      
      try {
        const sessionDate = new Date(s.予定日時);
        return sessionDate >= today && s.ステータス !== '完了';
      } catch (e) {
        Logger.log("セッション日付解析エラー: " + e.toString());
        return false;
      }
    });
    
    // 日付でソート
    upcomingSessions.sort((a, b) => {
      try {
        return new Date(a.予定日時) - new Date(b.予定日時);
      } catch (e) {
        return 0;
      }
    });
    
    let nextSession = upcomingSessions[0];
    if (nextSession && nextSession.予定日時) {
      try {
        const sessionDate = new Date(nextSession.予定日時);
        nextSessionStr = `${sessionDate.getFullYear()}/${(sessionDate.getMonth() + 1).toString().padStart(2, '0')}/${sessionDate.getDate().toString().padStart(2, '0')} ${sessionDate.getHours().toString().padStart(2, '0')}:${sessionDate.getMinutes().toString().padStart(2, '0')}`;
      } catch (e) {
        Logger.log("次回セッション日付のフォーマットエラー: " + e.toString());
        nextSessionStr = String(nextSession.予定日時);
      }
    }
    
    // クライアントのセッション履歴を取得
    const sessions = sessionData
      .filter(s => s && s.クライアントID === clientId)
      .map(s => {
        let dateTimeStr = '';
        try {
          if (s.予定日時) {
            const sessionDate = new Date(s.予定日時);
            dateTimeStr = `${sessionDate.getFullYear()}/${(sessionDate.getMonth() + 1).toString().padStart(2, '0')}/${sessionDate.getDate().toString().padStart(2, '0')} ${sessionDate.getHours().toString().padStart(2, '0')}:${sessionDate.getMinutes().toString().padStart(2, '0')}`;
          }
        } catch (e) {
          Logger.log("セッション履歴の日付フォーマットエラー: " + e.toString());
          dateTimeStr = String(s.予定日時);
        }
        
        return {
          id: s.セッションID,
          dateTime: dateTimeStr,
          type: s.セッション種別 || 'トライアル',
          number: s.セッション番号 || '-',
          format: s.Google_Meet_URL ? 'オンライン' : '対面',
          status: s.ステータス || '予定',
          notes: s.記録 || ''
        };
      });
    
    // 日付でソート（エラー処理を追加）
    sessions.sort((a, b) => {
      try {
        if (!a.dateTime || !b.dateTime) return 0;
        return new Date(b.dateTime) - new Date(a.dateTime);
      } catch (e) {
        return 0;
      }
    });
    
    // クライアントの支払い履歴を取得
    const payments = paymentData
      .filter(p => p && p.クライアントID === clientId)
      .map(p => {
        let dateStr = '';
        try {
          if (p.登録日) {
            if (p.登録日 instanceof Date) {
              dateStr = `${p.登録日.getFullYear()}/${(p.登録日.getMonth() + 1).toString().padStart(2, '0')}/${p.登録日.getDate().toString().padStart(2, '0')}`;
            } else {
              // 文字列の場合はそのまま使用
              dateStr = p.登録日;
            }
          }
        } catch (e) {
          Logger.log("支払い日付のフォーマットエラー: " + e.toString());
          dateStr = String(p.登録日);
        }
        
        return {
          id: p.支払いID,
          date: dateStr,
          item: p.項目 || '',
          amount: p.金額 || 0,
          status: p.状態 || '未設定',
          notes: p.備考 || ''
        };
      });
    
    // メモは現在のスプレッドシート構造にないため、セッション記録から取得
    const notes = sessions
      .filter(s => s.notes)
      .map((s, index) => {
        return {
          id: `N${index + 1}`,
          date: s.dateTime.split(' ')[0],
          content: s.notes
        };
      });
    
    // カナフリガナ対応
    const nameKana = client['お名前　（カナ）'] || client['お名前（カナ）'];
    
    // 詳細情報を返す
    const result = {
      basicInfo: {
        id: client.クライアントID,
        name: client.お名前,
        nameKana: nameKana,
        email: client.メールアドレス,
        phone: client['電話番号　（ハイフンなし）'] || client['電話番号'],
        gender: client.性別,
        birthdate: client.生年月日,
        address: client['ご住所'] || client.住所,
        sessionFormat: client['希望セッション形式'],
        notes: client['備考欄'] || client.備考,
        status: client['ステータス'] || 'トライアル',
        nextSession: nextSessionStr
      },
      sessions: sessions,
      payments: payments,
      notes: notes
    };
    
    Logger.log("getClientDetails completed successfully");
    return result;
  } catch (error) {
    // エラーのみをログに記録し、クライアントには詳細情報を返す
    Logger.log('Error in getClientDetails: ' + error.toString());
    return {
      error: "クライアント情報の取得中にエラーが発生しました: " + error.message
    };
  }
}

/**
 * クライアントのメモを保存する
 * @param {string} clientId - クライアントID
 * @param {string} content - メモ内容
 * @return {object} 処理結果
 */
function saveClientNote(clientId, content) {
  try {
    // TODO: メモの保存処理を実装
    // 現在のスプレッドシート構造ではメモのみを保存する場所がないため、
    // 新しいシートを作成するか、セッション記録として保存するなどの対応が必要
    
    return {
      success: true,
      message: 'メモを保存しました'
    };
  } catch (error) {
    // エラーのみをログに記録し、クライアントには最小限の情報のみを返す
    Logger.log('Error in saveClientNote: ' + error.toString());
    return {
      success: false,
      error: "メモの保存中にエラーが発生しました。"
    };
  }
}

/**
 * 新規セッションを予約する
 * @param {string} clientId - クライアントID
 * @param {string} sessionType - セッション種別
 * @param {string} sessionDate - セッション日時
 * @param {string} sessionFormat - セッション形式（オンライン/対面）
 * @return {object} 処理結果
 */
function scheduleNewSession(clientId, sessionType, sessionDate, sessionFormat) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sessionSheet = ss.getSheetByName('セッション管理');
    
    if (!sessionSheet) {
      throw new Error('セッション管理シートが見つかりません');
    }
    
    // クライアント情報を取得
    const clientSheet = ss.getSheetByName('クライアントinfo');
    const clientData = getSheetData(clientSheet);
    const client = clientData.find(c => c.クライアントID === clientId);
    
    if (!client) {
      throw new Error('クライアントが見つかりません');
    }
    
    // セッションIDを生成
    const sessionId = 'S' + new Date().getTime().toString(36);
    
    // 既存のセッションデータから、このクライアントの完了セッション数を取得
    const sessionData = getSheetData(sessionSheet);
    const completedSessions = sessionData.filter(s => 
      s.クライアントID === clientId && s.ステータス === '完了'
    ).length;
    
    // セッション番号を決定（トライアルは1、それ以外は完了セッション数+1）
    let sessionNumber = '';
    if (sessionType === 'trial') {
      sessionNumber = '1';
    } else {
      sessionNumber = (completedSessions + 1).toString();
    }
    
    // Google Meetリンクを生成（オンラインセッションの場合）
    let meetUrl = '';
    if (sessionFormat === 'online') {
      // 実際のアプリケーションでは、Google Calendar APIを使用してミーティングを作成し、
      // そのURLを取得するロジックを実装する必要があります
      meetUrl = 'https://meet.google.com/' + Math.random().toString(36).substring(2, 11);
    }
    
    // セッションデータをシートに追加
    const newRow = [
      sessionId,
      clientId,
      sessionType === 'trial' ? 'トライアル' : '継続セッション',
      sessionNumber,
      new Date(sessionDate),
      meetUrl,
      '予定',
      '', // 実施日時（セッション完了時に記録）
      '', // 記録
      '' // リマインダー状態
    ];
    
    // カラム順序に注意：スプレッドシートの列順と合わせる必要があります
    sessionSheet.appendRow(newRow);
    
    // クライアントのステータスを更新（例：新規→トライアル、トライアル済み→継続中）
    updateClientStatus(clientId, sessionType);
    
    return {
      success: true,
      sessionId: sessionId,
      message: 'セッションを予約しました'
    };
  } catch (error) {
    Logger.log('Error in scheduleNewSession: ' + error.toString());
    return {
      success: false,
      error: "セッション予約中にエラーが発生しました。"
    };
  }
}

/**
 * セッション完了処理
 * @param {string} sessionId - セッションID
 * @param {string} notes - セッションメモ
 * @return {object} 処理結果
 */
function completeSession(sessionId, notes) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sessionSheet = ss.getSheetByName('セッション管理');
    
    if (!sessionSheet) {
      throw new Error('セッション管理シートが見つかりません');
    }
    
    // セッションデータの検索
    const sessionData = getSheetData(sessionSheet);
    const sessionIndex = sessionData.findIndex(s => s.セッションID === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error('セッションが見つかりません');
    }
    
    // スプレッドシートの行は1から始まり、ヘッダー行があるため+2する
    const rowNum = sessionIndex + 2;
    
    // カラムインデックスを取得
    const headerRow = sessionSheet.getRange(1, 1, 1, sessionSheet.getLastColumn()).getValues()[0];
    const statusColIndex = headerRow.indexOf('ステータス') + 1; // 1-indexed
    const implementedDateColIndex = headerRow.indexOf('実施日時') + 1;
    const notesColIndex = headerRow.indexOf('記録') + 1;
    
    if (statusColIndex < 1) {
      throw new Error('ステータスカラムが見つかりません');
    }
    
    // ステータスを更新
    sessionSheet.getRange(rowNum, statusColIndex).setValue('完了');
    
    // 実施日時を更新
    if (implementedDateColIndex > 0) {
      sessionSheet.getRange(rowNum, implementedDateColIndex).setValue(new Date());
    }
    
    // 記録を更新
    if (notesColIndex > 0 && notes) {
      sessionSheet.getRange(rowNum, notesColIndex).setValue(notes);
    }
    
    return {
      success: true,
      message: 'セッションを完了しました'
    };
  } catch (error) {
    Logger.log('Error in completeSession: ' + error.toString());
    return {
      success: false,
      error: "セッション完了処理中にエラーが発生しました: " + error.message
    };
  }
}

/**
 * リマインダーメールを送信する
 * @param {string} sessionId - セッションID
 * @return {object} 処理結果
 */
function sendReminderEmail(sessionId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // セッション情報を取得
    const sessionSheet = ss.getSheetByName('セッション管理');
    if (!sessionSheet) {
      throw new Error('セッション管理シートが見つかりません');
    }
    
    const sessionData = getSheetData(sessionSheet);
    const session = sessionData.find(s => s.セッションID === sessionId);
    
    if (!session) {
      throw new Error('セッションが見つかりません');
    }
    
    // クライアント情報を取得
    const clientSheet = ss.getSheetByName('クライアントinfo');
    const clientData = getSheetData(clientSheet);
    const client = clientData.find(c => c.クライアントID === session.クライアントID);
    
    if (!client) {
      throw new Error('クライアントが見つかりません');
    }
    
    // セッション日時のフォーマット
    let sessionDateTime = '予定されているセッション';
    if (session.予定日時) {
      try {
        const date = new Date(session.予定日時);
        sessionDateTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      } catch (e) {
        sessionDateTime = String(session.予定日時);
      }
    }
    
    // メールテンプレートの取得（実際はメールテンプレートシートから取得）
    const subject = `【リマインダー】マインドエンジニアリング・コーチングセッションのお知らせ`;
    const body = 
      `${client.お名前} 様
      
明日のセッションのリマインダーをお送りします。

■セッション詳細
日時: ${sessionDateTime}
形式: ${session.Google_Meet_URL ? 'オンライン (Google Meet)' : '対面'}
${session.Google_Meet_URL ? `Google Meet URL: ${session.Google_Meet_URL}` : ''}

お時間になりましたら、${session.Google_Meet_URL ? 'Google Meetに接続' : 'ご来所'}をお願いいたします。

何かご質問がございましたら、お気軽にご連絡ください。
セッションを楽しみにしております。

---
森山雄太
マインドエンジニアリング・コーチング
Email: mindengineeringcoaching@gmail.com
Tel: 090-5710-7627
`;
    
    // メール送信
    MailApp.sendEmail({
      to: client.メールアドレス,
      subject: subject,
      body: body
    });
    
    // リマインダー送信状態を更新
    const sessionIndex = sessionData.findIndex(s => s.セッションID === sessionId);
    if (sessionIndex !== -1) {
      const rowNum = sessionIndex + 2; // ヘッダー行 + 0-indexedを1-indexedに変換
      
      // ヘッダーからリマインダーカラムのインデックスを取得
      const headerRow = sessionSheet.getRange(1, 1, 1, sessionSheet.getLastColumn()).getValues()[0];
      const reminderColIndex = headerRow.indexOf('リマインダー') + 1; // 1-indexed
      
      if (reminderColIndex > 0) {
        // リマインダー状態を更新
        sessionSheet.getRange(rowNum, reminderColIndex).setValue('送信済み');
      }
    }
    
    // メールログに記録（実装予定）
    
    return {
      success: true,
      message: 'リマインダーメールを送信しました'
    };
  } catch (error) {
    Logger.log('Error in sendReminderEmail: ' + error.toString());
    return {
      success: false,
      error: "リマインダーメール送信中にエラーが発生しました: " + error.message
    };
  }
}

/**
 * クライアントステータスを更新する
 * @param {string} clientId - クライアントID
 * @param {string} sessionType - セッション種別
 */
function updateClientStatus(clientId, sessionType) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const clientSheet = ss.getSheetByName('クライアントinfo');
    
    if (!clientSheet) return;
    
    const clientData = getSheetData(clientSheet);
    const clientIndex = clientData.findIndex(c => c.クライアントID === clientId);
    
    if (clientIndex === -1) return;
    
    // スプレッドシートの行は1から始まり、ヘッダー行があるため+2する
    const rowNum = clientIndex + 2;
    
    // ステータスカラムのインデックスを取得
    const headerRow = clientSheet.getRange(1, 1, 1, clientSheet.getLastColumn()).getValues()[0];
    const statusColIndex = headerRow.indexOf('ステータス') + 1; // 1-indexed
    
    if (statusColIndex < 1) return; // ステータスカラムが見つからない
    
    // 現在のステータスを取得
    const currentStatus = clientSheet.getRange(rowNum, statusColIndex).getValue();
    
    // 新しいステータスを決定
    let newStatus = currentStatus;
    
    if (sessionType === 'trial') {
      if (!currentStatus || currentStatus === '新規申込') {
        newStatus = 'トライアル';
      }
    } else {
      if (currentStatus === 'トライアル' || currentStatus === 'トライアル済み') {
        newStatus = '継続中';
      }
    }
    
    // ステータスが変わった場合のみ更新
    if (newStatus !== currentStatus) {
      clientSheet.getRange(rowNum, statusColIndex).setValue(newStatus);
    }
  } catch (error) {
    Logger.log('Error in updateClientStatus: ' + error.toString());
  }
}

/**
 * シートデータを取得するヘルパー関数
 * @param {Sheet} sheet - スプレッドシートオブジェクト
 * @return {Array} ヘッダーをキーとしたオブジェクト配列
 */
function getSheetData(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      rows.push(row);
    }
    
    return rows;
  } catch (error) {
    Logger.log('Error in getSheetData: ' + error.toString());
    return [];
  }
}