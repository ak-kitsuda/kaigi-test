// 予約データを格納する配列
let reservations = [];
let filteredDate = null;

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
  // 初期表示時のアニメーション
  animateElements();

  // フォームの送信イベントリスナーを設定
  document.getElementById('reservationForm').addEventListener('submit', handleReservationSubmit);

  // タブの切り替え機能
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      displayReservations(button.dataset.room);
    });
  });

  // 会議室選択時の画像ハイライト
  const roomSelect = document.getElementById('roomSelect');
  const roomImages = document.querySelectorAll('.room-image-item');

  // 初期選択された会議室をハイライト
  highlightSelectedRoom(roomSelect.value);

  // 選択変更時のイベント
  roomSelect.addEventListener('change', () => {
    highlightSelectedRoom(roomSelect.value);
  });

  // 会議室画像クリック時のイベント
  roomImages.forEach((item, index) => {
    item.addEventListener('click', () => {
      // インデックスを使用して会議室IDを設定（0:A, 1:B, 2:C）
      const roomId = String.fromCharCode(65 + index); // 65はASCIIコードの'A'
      roomSelect.value = roomId;
      highlightSelectedRoom(roomId);

      // クリック時のリップル効果
      createRippleEffect(item, event);

      // フォームにスクロール
      document.querySelector('.reservation-form').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // デフォルト日付の設定
  setDefaultDate();

  // 時間選択の依存関係を設定
  setupTimeSelectionLogic();

  // 日付フィルターのイベント設定
  setupDateFilter();

  // ローカルストレージから予約データを読み込む
  loadReservations();

  // 予約一覧を表示
  displayReservations('all');
});

// クリック時のリップルエフェクト
function createRippleEffect(element, event) {
  const ripple = document.createElement('span');
  ripple.classList.add('ripple-effect');

  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);

  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

  element.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// 初期表示時のアニメーション
function animateElements() {
  const elements = document.querySelectorAll('.room-image-item, .reservation-form, .reservation-list');
  elements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';

    setTimeout(() => {
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 100 * index);
  });
}

// 時間選択ロジックのセットアップ
function setupTimeSelectionLogic() {
  const startTimeSelect = document.getElementById('startTime');
  const endTimeSelect = document.getElementById('endTime');

  // 開始時間が変更されたら終了時間の選択肢を調整
  startTimeSelect.addEventListener('change', () => {
    const selectedStartTime = startTimeSelect.value;
    if (!selectedStartTime) return;

    // 終了時間選択肢をリセット
    updateEndTimeOptions(selectedStartTime);
  });

  // 初期状態で終了時間選択肢を設定
  if (startTimeSelect.value) {
    updateEndTimeOptions(startTimeSelect.value);
  }
}

// 終了時間の選択肢を更新（開始時間より前の選択肢を無効化）
function updateEndTimeOptions(startTime) {
  const endTimeSelect = document.getElementById('endTime');
  const endTimeOptions = endTimeSelect.querySelectorAll('option');

  endTimeOptions.forEach(option => {
    if (option.value === '') return; // "選択してください"はスキップ

    const isBeforeStart = option.value <= startTime;
    option.disabled = isBeforeStart;

    // 現在選択されている終了時間が無効になった場合は選択をクリア
    if (isBeforeStart && option.selected) {
      endTimeSelect.value = '';
    }
  });

  // 開始時間の30分後を自動選択（選択されていない場合のみ）
  if (!endTimeSelect.value) {
    const startTimeParts = startTime.split(':');
    let hours = parseInt(startTimeParts[0]);
    let minutes = parseInt(startTimeParts[1]);

    // 30分進める
    minutes += 30;
    if (minutes >= 60) {
      hours += 1;
      minutes -= 60;
    }

    const suggestedEndTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // 候補時間が選択肢にあれば選択
    for (const option of endTimeOptions) {
      if (option.value === suggestedEndTime) {
        endTimeSelect.value = suggestedEndTime;
        break;
      }
    }
  }
}

// デフォルトの日付を設定
function setDefaultDate() {
  const today = new Date();
  const dateInput = document.getElementById('reservationDate');

  // YYYY-MM-DD形式に変換
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  dateInput.value = `${year}-${month}-${day}`;

  // 今の時間に最も近い30分単位の時間スロットを計算
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  let startTimeValue;
  if (currentMinute < 30) {
    startTimeValue = `${currentHour.toString().padStart(2, '0')}:30`;
  } else {
    const nextHour = (currentHour + 1) % 24;
    startTimeValue = `${nextHour.toString().padStart(2, '0')}:00`;
  }

  // 営業時間内のみ設定（9:00～18:00）
  const startTimeSelect = document.getElementById('startTime');
  if (startTimeValue >= '09:00' && startTimeValue <= '18:00') {
    startTimeSelect.value = startTimeValue;
  } else {
    startTimeSelect.value = '09:00'; // 営業時間外の場合は9:00をデフォルトに
  }

  // 終了時間選択肢を更新
  updateEndTimeOptions(startTimeSelect.value);
}

// フォーム送信時の処理
function handleReservationSubmit(event) {
  event.preventDefault();

  // フォームから入力値を取得
  const room = document.getElementById('roomSelect').value;
  const reservationDate = document.getElementById('reservationDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const reserverName = document.getElementById('reserverName').value;

  // 日付と時間を結合してDateオブジェクトに変換
  const startDate = new Date(`${reservationDate}T${startTime}:00`);
  const endDate = new Date(`${reservationDate}T${endTime}:00`);

  // 入力検証
  if (!startTime || !endTime) {
    showNotification('開始時間と終了時間を選択してください', 'error');
    return;
  }

  if (startDate >= endDate) {
    showNotification('開始時間は終了時間より前に設定してください', 'error');
    return;
  }

  // 予約の重複チェック
  const overlap = isTimeSlotOverlapping(room, startDate, endDate);
  if (overlap) {
    const { reservation: overlappingReservation, type: overlapType } = overlap;
    const existingStart = formatDateTime(new Date(overlappingReservation.startDate));
    const existingEnd = formatDateTime(new Date(overlappingReservation.endDate));
    const errorMessage = `
      指定した時間帯は既に予約されています<span class="overlap-type">${overlapType}</span><br>
      <small>
        会議室${overlappingReservation.room}は ${existingStart} から ${existingEnd} まで
        ${overlappingReservation.reserverName} によって予約されています
      </small>
    `;
    showNotification(errorMessage, 'error', true);
    return;
  }

  // 予約情報を作成
  const newReservation = {
    id: Date.now().toString(), // ユニークIDとして現在のタイムスタンプを使用
    room,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    reserverName
  };

  // 予約を追加
  reservations.push(newReservation);

  // ローカルストレージに保存
  saveReservations();

  // CSVファイルとしてダウンロードできるようにする
  updateCSVDownload();

  // 予約一覧を更新
  displayReservations('all');

  // フォームをリセット
  document.getElementById('reservationForm').reset();
  setDefaultDate(); // デフォルト日付を再設定

  // 成功メッセージ
  showNotification('予約が完了しました', 'success');
}

// 予約の重複チェック
function isTimeSlotOverlapping(room, startDate, endDate) {
  let overlappingReservation = null;
  let overlapType = '';

  const hasOverlap = reservations.some(reservation => {
    if (reservation.room !== room) return false;

    const existingStart = new Date(reservation.startDate);
    const existingEnd = new Date(reservation.endDate);

    // 様々な重複パターンを検出
    const exactSameTime = startDate.getTime() === existingStart.getTime() &&
      endDate.getTime() === existingEnd.getTime();

    const sameStartTime = startDate.getTime() === existingStart.getTime();

    const sameEndTime = endDate.getTime() === existingEnd.getTime();

    const newContainsExisting = startDate <= existingStart && endDate >= existingEnd;

    const existingContainsNew = existingStart <= startDate && existingEnd >= endDate;

    const partialOverlap = startDate < existingEnd && endDate > existingStart;

    // いずれかの重複が見つかった場合
    if (exactSameTime || sameStartTime || sameEndTime || newContainsExisting ||
      existingContainsNew || partialOverlap) {

      overlappingReservation = reservation;

      // 重複のタイプを判定
      if (exactSameTime) {
        overlapType = '完全に同じ時間帯';
      } else if (sameStartTime && sameEndTime) {
        overlapType = '開始時間と終了時間が同じ';
      } else if (sameStartTime) {
        overlapType = '開始時間が同じ';
      } else if (sameEndTime) {
        overlapType = '終了時間が同じ';
      } else if (newContainsExisting) {
        overlapType = '既存の予約を含む';
      } else if (existingContainsNew) {
        overlapType = '既存の予約内に含まれる';
      } else {
        overlapType = '時間帯が部分的に重複';
      }

      return true;
    }

    return false;
  });

  return hasOverlap ? { reservation: overlappingReservation, type: overlapType } : false;
}

// 通知を表示
function showNotification(message, type, isHTML = false) {
  const notification = document.getElementById('notification');

  if (isHTML) {
    notification.innerHTML = message;
  } else {
    notification.textContent = message;
  }

  notification.className = 'notification';
  notification.classList.add(type);

  // 通知を表示
  notification.style.opacity = '1';

  // エラーの場合は表示時間を長くする
  const displayTime = type === 'error' ? 6000 : 3000;

  // 既存のタイマーをクリアする
  if (window.notificationTimer) {
    clearTimeout(window.notificationTimer);
  }

  // 新しいタイマーをセット
  window.notificationTimer = setTimeout(() => {
    notification.style.opacity = '0';
  }, displayTime);
}

// 予約一覧を表示
function displayReservations(roomFilter) {
  const reservationList = document.getElementById('reservationList');
  reservationList.innerHTML = '';

  // 日付でソート
  const sortedReservations = [...reservations].sort((a, b) =>
    new Date(a.startDate) - new Date(b.startDate)
  );

  // 部屋でフィルタリング
  let filteredReservations = roomFilter === 'all'
    ? sortedReservations
    : sortedReservations.filter(r => r.room === roomFilter);

  // 日付でフィルタリング
  if (filteredDate) {
    filteredReservations = filteredReservations.filter(r => {
      const reservationDate = new Date(r.startDate);
      reservationDate.setHours(0, 0, 0, 0);
      return reservationDate.getTime() === filteredDate.getTime();
    });
  }

  if (filteredReservations.length === 0) {
    let emptyMessage = '予約はありません';
    if (filteredDate) {
      const formattedDate = filteredDate.toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      emptyMessage = `${formattedDate}の予約はありません`;
    }
    reservationList.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>${emptyMessage}</p></div>`;
    return;
  }

  // 予約一覧を生成
  filteredReservations.forEach(reservation => {
    const reservationItem = document.createElement('div');
    reservationItem.className = 'reservation-item';

    // 日時のフォーマット
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    const formattedStart = formatDateTime(start);
    const formattedEnd = formatDateTime(end);
    const duration = calculateDuration(start, end);

    // 日付から背景色を計算
    const today = new Date();
    let statusClass = '';

    if (end < today) {
      statusClass = 'past';
    } else if (start <= today && end >= today) {
      statusClass = 'current';
    } else {
      statusClass = 'upcoming';
    }

    reservationItem.classList.add(statusClass);

    // 予約項目のHTML構築（折りたたみ可能な詳細を含む）
    const detailId = `detail-${reservation.id}`;

    reservationItem.innerHTML = `
            <div class="reservation-header">
                <h3><i class="fas fa-door-open"></i> 会議室${reservation.room}</h3>
                <span class="reservation-status">${getStatusText(statusClass)}</span>
            </div>
            <p class="reservation-date"><i class="fas fa-calendar-day"></i> ${formatDateOnly(start)}</p>
            <p><i class="fas fa-user"></i> <strong>予約者:</strong> ${reservation.reserverName}</p>
            <p><i class="fas fa-clock"></i> <strong>時間:</strong> ${formatTimeOnly(start)} 〜 ${formatTimeOnly(end)} (${duration})</p>
            
            <div class="reservation-actions">
                <button class="detail-toggle" data-target="${detailId}">
                    <i class="fas fa-chevron-down"></i> 詳細
                </button>
                <button class="btn cancel-btn" onclick="cancelReservation('${reservation.id}')">
                    <i class="fas fa-times-circle"></i> キャンセル
                </button>
            </div>
            
            <div id="${detailId}" class="reservation-details" style="display: none;">
                <div class="reservation-time">
                    <p><i class="fas fa-clock"></i> <strong>開始:</strong> ${formattedStart}</p>
                    <p><i class="fas fa-clock"></i> <strong>終了:</strong> ${formattedEnd}</p>
                    <p><i class="fas fa-hourglass-half"></i> <strong>利用時間:</strong> ${duration}</p>
                </div>
                <p><i class="fas fa-info-circle"></i> <strong>予約ID:</strong> ${reservation.id}</p>
                <p><i class="fas fa-calendar-plus"></i> <strong>予約作成日:</strong> ${formatCreationDate(reservation.id)}</p>
            </div>
        `;

    reservationList.appendChild(reservationItem);

    // 詳細トグルボタンのイベント設定
    const detailToggle = reservationItem.querySelector('.detail-toggle');
    detailToggle.addEventListener('click', () => {
      const targetId = detailToggle.dataset.target;
      const detailElement = document.getElementById(targetId);

      if (detailElement.style.display === 'none') {
        detailElement.style.display = 'block';
        detailToggle.innerHTML = '<i class="fas fa-chevron-up"></i> 閉じる';
      } else {
        detailElement.style.display = 'none';
        detailToggle.innerHTML = '<i class="fas fa-chevron-down"></i> 詳細';
      }
    });
  });
}

// 予約ステータスのテキストを取得
function getStatusText(status) {
  switch (status) {
    case 'past':
      return '終了';
    case 'current':
      return '利用中';
    case 'upcoming':
      return '予約済';
    default:
      return '';
  }
}

// 利用時間を計算
function calculateDuration(start, end) {
  const diff = end - start;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours === 0) {
    return `${minutes}分`;
  } else if (minutes === 0) {
    return `${hours}時間`;
  } else {
    return `${hours}時間${minutes}分`;
  }
}

// 日時フォーマット
function formatDateTime(date) {
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleString('ja-JP', options);
}

// 予約をキャンセル
function cancelReservation(id) {
  reservations = reservations.filter(reservation => reservation.id !== id);
  saveReservations();
  updateCSVDownload();
  displayReservations(document.querySelector('.tab-btn.active').dataset.room);
  showNotification('予約がキャンセルされました', 'success');
}

// ローカルストレージに予約を保存
function saveReservations() {
  localStorage.setItem('roomReservations', JSON.stringify(reservations));
}

// ローカルストレージから予約を読み込む
function loadReservations() {
  const savedReservations = localStorage.getItem('roomReservations');
  if (savedReservations) {
    reservations = JSON.parse(savedReservations);
  }
}

// CSVファイルのダウンロードを更新
function updateCSVDownload() {
  // CSVデータを生成
  let csvContent = 'Room,ReserverName,StartDate,EndDate\n';

  reservations.forEach(reservation => {
    csvContent += `${reservation.room},${reservation.reserverName},${reservation.startDate},${reservation.endDate}\n`;
  });

  // CSVファイルとしてダウンロードするためのリンクを作成または更新
  let downloadLink = document.getElementById('csvDownload');
  if (!downloadLink) {
    downloadLink = document.createElement('a');
    downloadLink.id = 'csvDownload';
    downloadLink.innerHTML = 'CSVでダウンロード';
    downloadLink.className = 'btn';
    downloadLink.style.marginTop = '20px';
    document.querySelector('.reservation-list').appendChild(downloadLink);
  }

  // CSVデータをBlobに変換
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // ダウンロードリンクを設定
  downloadLink.href = url;
  downloadLink.download = 'reservations.csv';
}

// 選択された会議室の画像をハイライト
function highlightSelectedRoom(roomId) {
  const roomImages = document.querySelectorAll('.room-image-item');

  roomImages.forEach((item, index) => {
    // インデックスを使用して会議室IDを判定（0:A, 1:B, 2:C）
    const currentRoomId = String.fromCharCode(65 + index); // 65はASCIIコードの'A'

    if (currentRoomId === roomId) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

// 日付フィルター機能のセットアップ
function setupDateFilter() {
  const filterButton = document.getElementById('filterButton');
  const clearFilterButton = document.getElementById('clearFilterButton');
  const dateFilter = document.getElementById('dateFilter');

  filterButton.addEventListener('click', () => {
    const selectedDate = dateFilter.value;
    if (selectedDate) {
      filteredDate = new Date(selectedDate);
      filteredDate.setHours(0, 0, 0, 0);
      displayReservations(document.querySelector('.tab-btn.active').dataset.room);

      // フィルターが適用されていることを視覚的に示す
      dateFilter.classList.add('active-filter');
      filterButton.classList.add('active-filter');
    }
  });

  clearFilterButton.addEventListener('click', () => {
    filteredDate = null;
    dateFilter.value = '';
    displayReservations(document.querySelector('.tab-btn.active').dataset.room);

    // フィルター適用中の視覚的な表示をクリア
    dateFilter.classList.remove('active-filter');
    filterButton.classList.remove('active-filter');
  });
}

// 日付のみをフォーマット
function formatDateOnly(date) {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  });
}

// 時間のみをフォーマット
function formatTimeOnly(date) {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit', minute: '2-digit'
  });
}

// 予約作成日を計算（IDからタイムスタンプを取得）
function formatCreationDate(id) {
  const timestamp = parseInt(id);
  if (!isNaN(timestamp)) {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP');
  }
  return '不明';
} 