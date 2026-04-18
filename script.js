(() => {
  const boardEl = document.getElementById("board");
  const statusTextEl = document.getElementById("statusText");
  const botPhraseEl = document.getElementById("botPhrase");
  const resetBtn = document.getElementById("resetBtn");
  const difficultySelect = document.getElementById("difficultySelect");
  const bearEl = document.getElementById("bear");
  const logoFrameEl = document.getElementById("logoFrame");

  if (!boardEl || !statusTextEl || !botPhraseEl || !resetBtn || !difficultySelect || !bearEl || !logoFrameEl) {
    return;
  }

  const PIECE_TO_FOLDER = {
    P: "pawn",
    N: "knight",
    B: "bishop",
    R: "rook",
    Q: "queen",
    K: "king"
  };

  const PIECE_VALUES = {
    P: 100,
    N: 320,
    B: 330,
    R: 500,
    Q: 900,
    K: 20000
  };

  const LOGO_FRAMES = [
    "imagem/LOGOGAME1.png",
    "imagem/LOGOGAME2.png",
    "imagem/LOGOGAME3.png",
    "imagem/LOGOGAME4.png"
  ];
  const BOT_NAME = "Russell";
  const BOT_RATING = 1800;

  const AI_DEPTH_BY_LEVEL = {
    easy: 1,
    medium: 2,
    hard: 3
  };

  const AI_DELAY_BY_LEVEL = {
    easy: [700, 1000],
    medium: [1100, 1550],
    hard: [1500, 2100]
  };

  const PLAYER_COLOR = "w";
  const AI_COLOR = "b";
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  const PHRASES = {
    playerMove: [
      "Boa! Voce desenvolveu bem.",
      "Gostei desse lance, muito limpo.",
      "Voce esta construindo um ataque forte.",
      "Movimento elegante. Pressao crescendo."
    ],
    aiMove: [
      "Minha resposta veio no tempo certo.",
      "Eu segui com um plano posicional.",
      "Estou ajustando as pecas para o contra-ataque.",
      "Lance solido, continuamos."
    ],
    playerCapture: [
      "Excelente captura! Material na frente.",
      "Voce pegou uma peca importante.",
      "Impacto forte no centro do tabuleiro."
    ],
    aiCapture: [
      "Consegui capturar uma peca sua.",
      "Capturei para equilibrar a posicao.",
      "Foi uma troca favoravel para mim."
    ],
    playerCheck: [
      "Xeque aplicado! Rei sob pressao.",
      "Voce deu xeque com precisao."
    ],
    aiCheck: [
      "Xeque em voce. Defenda o rei!",
      "Seu rei entrou no meu radar."
    ],
    playerMate: [
      "Xeque-mate! Classe mundial.",
      "Finalizacao perfeita. Partida sua."
    ],
    aiMate: [
      "Xeque-mate. Boa luta, vamos outra.",
      "Eu fechei a partida desta vez."
    ],
    draw: [
      "Empate tecnico. Foi uma boa batalha."
    ],
    reset: [
      "Tabuleiro resetado. Vamos de novo!"
    ]
  };

  let gameState = createInitialState();
  let selectedSquare = null;
  let turnLegalMoves = [];
  let aiDepth = AI_DEPTH_BY_LEVEL.medium;
  let aiThinking = false;
  let gameOver = false;
  let mateSquare = null;

  let logoIndex = 0;
  let bearTalkTimer = null;
  let aiDelayWindow = AI_DELAY_BY_LEVEL.medium;

  function createInitialState() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];

    for (let c = 0; c < 8; c += 1) {
      board[0][c] = `b${back[c]}`;
      board[1][c] = "bP";
      board[6][c] = "wP";
      board[7][c] = `w${back[c]}`;
    }

    return {
      board,
      turn: "w",
      castling: {
        wK: true,
        wQ: true,
        bK: true,
        bQ: true
      },
      enPassant: null,
      fullmove: 1
    };
  }

  function cloneState(state) {
    return {
      board: state.board.map((row) => row.slice()),
      turn: state.turn,
      castling: { ...state.castling },
      enPassant: state.enPassant ? { ...state.enPassant } : null,
      fullmove: state.fullmove
    };
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function pieceColor(piece) {
    return piece ? piece[0] : null;
  }

  function pieceType(piece) {
    return piece ? piece[1] : null;
  }

  function opposite(color) {
    return color === "w" ? "b" : "w";
  }

  function squareToSelector(r, c) {
    return `.square[data-r="${r}"][data-c="${c}"]`;
  }

  function getPieceImagePath(piece) {
    if (!piece) {
      return "";
    }

    const colorFolder = pieceColor(piece) === "w" ? "white" : "black";
    const typeFolder = PIECE_TO_FOLDER[pieceType(piece)];
    return `imagem/pieces/${colorFolder}/${typeFolder}/${typeFolder}1.png`;
  }

  function triggerBearHurt() {
    if (bearTalkTimer) {
      window.clearTimeout(bearTalkTimer);
      bearTalkTimer = null;
    }
    bearEl.classList.remove("talk");
    bearEl.classList.remove("hurt");
    // Restart the one-shot sprite animation
    void bearEl.offsetWidth;
    bearEl.classList.add("hurt");
    window.setTimeout(() => bearEl.classList.remove("hurt"), 540);
  }

  function triggerBearTalk() {
    if (bearEl.classList.contains("hurt")) {
      return;
    }

    bearEl.classList.remove("talk");
    void bearEl.offsetWidth;
    bearEl.classList.add("talk");

    if (bearTalkTimer) {
      window.clearTimeout(bearTalkTimer);
    }
    bearTalkTimer = window.setTimeout(() => {
      bearEl.classList.remove("talk");
      bearTalkTimer = null;
    }, 980);
  }

  function triggerSquareFx(r, c, className) {
    const sq = boardEl.querySelector(squareToSelector(r, c));
    if (!sq) {
      return;
    }

    sq.classList.remove("hit", "mate");
    void sq.offsetWidth;
    sq.classList.add(className);

    const ttl = className === "mate" ? 860 : 360;
    window.setTimeout(() => sq.classList.remove(className), ttl);
  }

  function squareName(pos) {
    return `${FILES[pos.c]}${8 - pos.r}`;
  }

  function getCaptureMeta(state, move) {
    if (!move.capture && !move.isEnPassant) {
      return null;
    }

    const movingPiece = state.board[move.from.r][move.from.c];
    if (!movingPiece) {
      return null;
    }

    if (move.isEnPassant) {
      const mover = pieceColor(movingPiece);
      const capRow = mover === "w" ? move.to.r + 1 : move.to.r - 1;
      const capturedPiece = state.board[capRow][move.to.c];
      if (!capturedPiece) {
        return null;
      }
      return {
        piece: capturedPiece,
        square: { r: capRow, c: move.to.c }
      };
    }

    const capturedPiece = state.board[move.to.r][move.to.c];
    if (!capturedPiece) {
      return null;
    }
    return {
      piece: capturedPiece,
      square: { r: move.to.r, c: move.to.c }
    };
  }

  function launchCapturedPieceAtRussell(captureMeta) {
    if (!captureMeta) {
      triggerBearHurt();
      return;
    }

    const fromSquare = boardEl.querySelector(
      squareToSelector(captureMeta.square.r, captureMeta.square.c)
    );

    if (!fromSquare) {
      triggerBearHurt();
      return;
    }

    const startRect = fromSquare.getBoundingClientRect();
    const bearRect = bearEl.getBoundingClientRect();
    if (!startRect.width || !bearRect.width) {
      triggerBearHurt();
      return;
    }

    const projectile = document.createElement("img");
    projectile.className = "capture-projectile";
    projectile.src = getPieceImagePath(captureMeta.piece);
    projectile.alt = "";

    const size = Math.max(52, Math.min(90, startRect.width * 1.12));
    const startX = startRect.left + startRect.width / 2 - size / 2;
    const startY = startRect.top + startRect.height / 2 - size / 2;
    const targetX = bearRect.left + bearRect.width * 0.52 - size / 2;
    const targetY = bearRect.top + bearRect.height * 0.46 - size / 2;

    projectile.style.width = `${size}px`;
    projectile.style.height = `${size}px`;
    projectile.style.left = `${startX}px`;
    projectile.style.top = `${startY}px`;

    document.body.appendChild(projectile);

    const dx = targetX - startX;
    const dy = targetY - startY;
    const spin = dx >= 0 ? 450 : -450;

    let finished = false;
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      projectile.remove();
      triggerBearHurt();
    };

    projectile.addEventListener("transitionend", finish, { once: true });
    window.setTimeout(finish, 740);

    window.requestAnimationFrame(() => {
      projectile.classList.add("fly");
      projectile.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${spin}deg) scale(0.32)`;
    });
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function setBotPhrase(text) {
    botPhraseEl.textContent = `${BOT_NAME} (${BOT_RATING}): ${text}`;
    triggerBearTalk();
  }

  function isSquareAttacked(state, r, c, attackerColor) {
    const board = state.board;

    // Pawn attacks
    const pawnSourceRow = attackerColor === "w" ? r + 1 : r - 1;
    if (inBounds(pawnSourceRow, c - 1) && board[pawnSourceRow][c - 1] === `${attackerColor}P`) {
      return true;
    }
    if (inBounds(pawnSourceRow, c + 1) && board[pawnSourceRow][c + 1] === `${attackerColor}P`) {
      return true;
    }

    // Knight attacks
    const knightSteps = [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1]
    ];
    for (const [dr, dc] of knightSteps) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === `${attackerColor}N`) {
        return true;
      }
    }

    // Sliding diagonal (bishop/queen)
    const diagDirs = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];
    for (const [dr, dc] of diagDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const sq = board[nr][nc];
        if (sq) {
          if (pieceColor(sq) === attackerColor && (pieceType(sq) === "B" || pieceType(sq) === "Q")) {
            return true;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    // Sliding straight (rook/queen)
    const lineDirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];
    for (const [dr, dc] of lineDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const sq = board[nr][nc];
        if (sq) {
          if (pieceColor(sq) === attackerColor && (pieceType(sq) === "R" || pieceType(sq) === "Q")) {
            return true;
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }

    // King attacks
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) {
          continue;
        }
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc] === `${attackerColor}K`) {
          return true;
        }
      }
    }

    return false;
  }

  function findKing(state, color) {
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        if (state.board[r][c] === `${color}K`) {
          return { r, c };
        }
      }
    }
    return null;
  }

  function isInCheck(state, color) {
    const king = findKing(state, color);
    if (!king) {
      return true;
    }
    return isSquareAttacked(state, king.r, king.c, opposite(color));
  }

  function generatePseudoMoves(state, r, c) {
    const board = state.board;
    const piece = board[r][c];
    if (!piece) {
      return [];
    }

    const color = pieceColor(piece);
    const type = pieceType(piece);
    const moves = [];

    const pushMove = (toR, toC, extra = {}) => {
      const target = board[toR][toC];
      moves.push({
        from: { r, c },
        to: { r: toR, c: toC },
        piece,
        capture: target || null,
        ...extra
      });
    };

    if (type === "P") {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;
      const lastRow = color === "w" ? 0 : 7;

      const oneAhead = r + dir;
      if (inBounds(oneAhead, c) && !board[oneAhead][c]) {
        if (oneAhead === lastRow) {
          pushMove(oneAhead, c, { promotion: "Q" });
        } else {
          pushMove(oneAhead, c);
        }

        const twoAhead = r + dir * 2;
        if (r === startRow && !board[twoAhead][c]) {
          pushMove(twoAhead, c, { doublePawn: true });
        }
      }

      for (const dc of [-1, 1]) {
        const tr = r + dir;
        const tc = c + dc;
        if (!inBounds(tr, tc)) {
          continue;
        }

        const target = board[tr][tc];
        if (target && pieceColor(target) !== color) {
          if (tr === lastRow) {
            pushMove(tr, tc, { promotion: "Q" });
          } else {
            pushMove(tr, tc);
          }
          continue;
        }

        if (state.enPassant && state.enPassant.r === tr && state.enPassant.c === tc) {
          pushMove(tr, tc, {
            isEnPassant: true,
            capture: `${opposite(color)}P`
          });
        }
      }

      return moves;
    }

    if (type === "N") {
      const steps = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1]
      ];
      for (const [dr, dc] of steps) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) {
          continue;
        }
        const target = board[nr][nc];
        if (!target || pieceColor(target) !== color) {
          pushMove(nr, nc);
        }
      }
      return moves;
    }

    if (type === "B" || type === "R" || type === "Q") {
      const dirs = [];
      if (type === "B" || type === "Q") {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (type === "R" || type === "Q") {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }

      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            pushMove(nr, nc);
          } else {
            if (pieceColor(target) !== color) {
              pushMove(nr, nc);
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }

      return moves;
    }

    if (type === "K") {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) {
            continue;
          }
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) {
            continue;
          }
          const target = board[nr][nc];
          if (!target || pieceColor(target) !== color) {
            pushMove(nr, nc);
          }
        }
      }

      const enemy = opposite(color);
      if (!isInCheck(state, color)) {
        if (color === "w" && r === 7 && c === 4) {
          if (
            state.castling.wK &&
            board[7][7] === "wR" &&
            !board[7][5] &&
            !board[7][6] &&
            !isSquareAttacked(state, 7, 5, enemy) &&
            !isSquareAttacked(state, 7, 6, enemy)
          ) {
            pushMove(7, 6, { castle: "K" });
          }
          if (
            state.castling.wQ &&
            board[7][0] === "wR" &&
            !board[7][1] &&
            !board[7][2] &&
            !board[7][3] &&
            !isSquareAttacked(state, 7, 3, enemy) &&
            !isSquareAttacked(state, 7, 2, enemy)
          ) {
            pushMove(7, 2, { castle: "Q" });
          }
        }

        if (color === "b" && r === 0 && c === 4) {
          if (
            state.castling.bK &&
            board[0][7] === "bR" &&
            !board[0][5] &&
            !board[0][6] &&
            !isSquareAttacked(state, 0, 5, enemy) &&
            !isSquareAttacked(state, 0, 6, enemy)
          ) {
            pushMove(0, 6, { castle: "K" });
          }
          if (
            state.castling.bQ &&
            board[0][0] === "bR" &&
            !board[0][1] &&
            !board[0][2] &&
            !board[0][3] &&
            !isSquareAttacked(state, 0, 3, enemy) &&
            !isSquareAttacked(state, 0, 2, enemy)
          ) {
            pushMove(0, 2, { castle: "Q" });
          }
        }
      }

      return moves;
    }

    return moves;
  }

  function applyMove(state, move) {
    const next = cloneState(state);
    const board = next.board;

    const from = move.from;
    const to = move.to;

    const movingPiece = board[from.r][from.c];
    const movingColor = pieceColor(movingPiece);
    const movingType = pieceType(movingPiece);

    let capturedPiece = board[to.r][to.c];

    board[from.r][from.c] = null;

    if (move.isEnPassant) {
      const capRow = movingColor === "w" ? to.r + 1 : to.r - 1;
      capturedPiece = board[capRow][to.c];
      board[capRow][to.c] = null;
    }

    if (move.castle === "K") {
      if (movingColor === "w") {
        board[7][5] = board[7][7];
        board[7][7] = null;
      } else {
        board[0][5] = board[0][7];
        board[0][7] = null;
      }
    }

    if (move.castle === "Q") {
      if (movingColor === "w") {
        board[7][3] = board[7][0];
        board[7][0] = null;
      } else {
        board[0][3] = board[0][0];
        board[0][0] = null;
      }
    }

    let finalPiece = movingPiece;
    if (move.promotion) {
      finalPiece = `${movingColor}${move.promotion}`;
    }

    board[to.r][to.c] = finalPiece;

    // Castling rights updates
    if (movingType === "K") {
      if (movingColor === "w") {
        next.castling.wK = false;
        next.castling.wQ = false;
      } else {
        next.castling.bK = false;
        next.castling.bQ = false;
      }
    }

    if (movingType === "R") {
      if (from.r === 7 && from.c === 0) {
        next.castling.wQ = false;
      }
      if (from.r === 7 && from.c === 7) {
        next.castling.wK = false;
      }
      if (from.r === 0 && from.c === 0) {
        next.castling.bQ = false;
      }
      if (from.r === 0 && from.c === 7) {
        next.castling.bK = false;
      }
    }

    if (capturedPiece && pieceType(capturedPiece) === "R") {
      if (to.r === 7 && to.c === 0) {
        next.castling.wQ = false;
      }
      if (to.r === 7 && to.c === 7) {
        next.castling.wK = false;
      }
      if (to.r === 0 && to.c === 0) {
        next.castling.bQ = false;
      }
      if (to.r === 0 && to.c === 7) {
        next.castling.bK = false;
      }
    }

    next.enPassant = null;
    if (movingType === "P" && Math.abs(to.r - from.r) === 2) {
      next.enPassant = {
        r: (to.r + from.r) / 2,
        c: from.c
      };
    }

    next.turn = opposite(state.turn);

    if (next.turn === "w") {
      next.fullmove += 1;
    }

    return next;
  }

  function generateLegalMoves(state, color = state.turn) {
    const legal = [];

    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const piece = state.board[r][c];
        if (!piece || pieceColor(piece) !== color) {
          continue;
        }

        const pseudo = generatePseudoMoves(state, r, c);
        for (const mv of pseudo) {
          const testState = applyMove(state, mv);
          if (!isInCheck(testState, color)) {
            legal.push(mv);
          }
        }
      }
    }

    return legal;
  }

  function evaluateBoard(state, legalMovesForTurn = null, depth = 0) {
    const legal = legalMovesForTurn || generateLegalMoves(state, state.turn);

    if (legal.length === 0) {
      if (isInCheck(state, state.turn)) {
        return state.turn === AI_COLOR ? -900000 - depth * 1200 : 900000 + depth * 1200;
      }
      return 0;
    }

    let score = 0;

    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const piece = state.board[r][c];
        if (!piece) {
          continue;
        }

        const color = pieceColor(piece);
        const type = pieceType(piece);
        const base = PIECE_VALUES[type] || 0;

        // Small center control bonus
        const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
        const centerBonus = (3.5 - centerDist) * 4;

        if (color === AI_COLOR) {
          score += base + centerBonus;
        } else {
          score -= base + centerBonus;
        }
      }
    }

    // Mobility bias for side to move
    const mobility = legal.length;
    score += state.turn === AI_COLOR ? mobility * 1.5 : -mobility * 1.5;

    return score;
  }

  function orderMoves(moves) {
    return moves.slice().sort((a, b) => {
      const aScore = (a.capture ? 10 : 0) + (a.promotion ? 8 : 0) + (a.castle ? 2 : 0);
      const bScore = (b.capture ? 10 : 0) + (b.promotion ? 8 : 0) + (b.castle ? 2 : 0);
      return bScore - aScore;
    });
  }

  function minimax(state, depth, alpha, beta) {
    const legal = generateLegalMoves(state, state.turn);

    if (depth === 0 || legal.length === 0) {
      return evaluateBoard(state, legal, depth);
    }

    if (state.turn === AI_COLOR) {
      let best = -Infinity;
      for (const mv of orderMoves(legal)) {
        const child = applyMove(state, mv);
        const score = minimax(child, depth - 1, alpha, beta);
        if (score > best) {
          best = score;
        }
        if (best > alpha) {
          alpha = best;
        }
        if (alpha >= beta) {
          break;
        }
      }
      return best;
    }

    let best = Infinity;
    for (const mv of orderMoves(legal)) {
      const child = applyMove(state, mv);
      const score = minimax(child, depth - 1, alpha, beta);
      if (score < best) {
        best = score;
      }
      if (best < beta) {
        beta = best;
      }
      if (alpha >= beta) {
        break;
      }
    }
    return best;
  }

  function chooseAiMove(state, depth) {
    const legal = generateLegalMoves(state, AI_COLOR);
    if (!legal.length) {
      return null;
    }

    let bestScore = -Infinity;
    let bestMoves = [];

    for (const mv of orderMoves(legal)) {
      const child = applyMove(state, mv);
      const score = minimax(child, depth - 1, -Infinity, Infinity);

      if (score > bestScore + 0.0001) {
        bestScore = score;
        bestMoves = [mv];
      } else if (Math.abs(score - bestScore) <= 0.0001) {
        bestMoves.push(mv);
      }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)] || legal[0];
  }

  function currentPlayerLabel() {
    return gameState.turn === "w" ? "brancas (voce)" : "pretas (IA)";
  }

  function applyMoveAndRefresh(move, moverColor) {
    const wasCapture = Boolean(move.capture || move.isEnPassant);
    const captureMeta = wasCapture ? getCaptureMeta(gameState, move) : null;

    gameState = applyMove(gameState, move);
    selectedSquare = null;
    mateSquare = null;

    turnLegalMoves = generateLegalMoves(gameState, gameState.turn);
    renderBoard();

    if (wasCapture) {
      const fxSquare = captureMeta ? captureMeta.square : move.to;
      triggerSquareFx(fxSquare.r, fxSquare.c, "hit");
      launchCapturedPieceAtRussell(captureMeta);
    }

    const sideToMove = gameState.turn;
    const checkOnSideToMove = isInCheck(gameState, sideToMove);
    const isMate = turnLegalMoves.length === 0 && checkOnSideToMove;
    const isStalemate = turnLegalMoves.length === 0 && !checkOnSideToMove;
    const moveText = `${squareName(move.from)}-${squareName(move.to)}`;

    if (isMate) {
      if (moverColor === PLAYER_COLOR) {
        setBotPhrase(`${pickRandom(PHRASES.playerMate)} (${moveText})`);
      } else {
        setBotPhrase(`${pickRandom(PHRASES.aiMate)} (${moveText})`);
      }
    } else if (isStalemate) {
      setBotPhrase(`${pickRandom(PHRASES.draw)} (${moveText})`);
    } else if (checkOnSideToMove) {
      if (moverColor === PLAYER_COLOR) {
        setBotPhrase(`${pickRandom(PHRASES.playerCheck)} (${moveText})`);
      } else {
        setBotPhrase(`${pickRandom(PHRASES.aiCheck)} (${moveText})`);
      }
    } else if (wasCapture) {
      if (moverColor === PLAYER_COLOR) {
        setBotPhrase(`${pickRandom(PHRASES.playerCapture)} (${moveText})`);
      } else {
        setBotPhrase(`${pickRandom(PHRASES.aiCapture)} (${moveText})`);
      }
    } else if (moverColor === PLAYER_COLOR) {
      setBotPhrase(`${pickRandom(PHRASES.playerMove)} (${moveText})`);
    } else {
      setBotPhrase(`${pickRandom(PHRASES.aiMove)} (${moveText})`);
    }

    updateGameStatus();
  }

  function updateGameStatus() {
    const inCheck = isInCheck(gameState, gameState.turn);

    if (turnLegalMoves.length === 0) {
      gameOver = true;

      if (inCheck) {
        const loser = gameState.turn;
        const winner = opposite(loser);
        const loserKing = findKing(gameState, loser);

        if (loserKing) {
          mateSquare = loserKing;
          renderBoard();
          triggerSquareFx(loserKing.r, loserKing.c, "mate");
          triggerBearHurt();
        }

        statusTextEl.textContent = winner === "w"
          ? "Xeque-mate! Voce venceu a IA."
          : "Xeque-mate! A IA venceu esta rodada.";
      } else {
        statusTextEl.textContent = "Empate por afogamento.";
      }
      return;
    }

    gameOver = false;

    if (aiThinking) {
      statusTextEl.textContent = "IA pensando...";
      return;
    }

    if (inCheck) {
      statusTextEl.textContent = gameState.turn === "w"
        ? "Xeque! Seu rei esta sob ataque."
        : "Xeque no rei da IA.";
      return;
    }

    statusTextEl.textContent = `Vez de ${currentPlayerLabel()}.`;
  }

  function onSquareClick(r, c) {
    if (gameOver || aiThinking) {
      return;
    }

    if (gameState.turn !== PLAYER_COLOR) {
      return;
    }

    const piece = gameState.board[r][c];

    if (selectedSquare) {
      const selectedMoves = turnLegalMoves.filter(
        (mv) => mv.from.r === selectedSquare.r && mv.from.c === selectedSquare.c
      );

      const chosen = selectedMoves.find((mv) => mv.to.r === r && mv.to.c === c);
      if (chosen) {
        applyMoveAndRefresh(chosen, PLAYER_COLOR);

        if (!gameOver && gameState.turn === AI_COLOR) {
          runAiTurn();
        }
        return;
      }

      if (piece && pieceColor(piece) === PLAYER_COLOR) {
        selectedSquare = { r, c };
        renderBoard();
        return;
      }

      selectedSquare = null;
      renderBoard();
      return;
    }

    if (piece && pieceColor(piece) === PLAYER_COLOR) {
      selectedSquare = { r, c };
      renderBoard();
    }
  }

  function runAiTurn() {
    aiThinking = true;
    updateGameStatus();

    const delayMs = aiDelayWindow[0] + Math.floor(Math.random() * (aiDelayWindow[1] - aiDelayWindow[0] + 1));

    window.setTimeout(() => {
      const aiMove = chooseAiMove(gameState, aiDepth);

      aiThinking = false;

      if (!aiMove) {
        turnLegalMoves = generateLegalMoves(gameState, gameState.turn);
        updateGameStatus();
        renderBoard();
        return;
      }

      applyMoveAndRefresh(aiMove, AI_COLOR);
    }, delayMs);
  }

  function renderBoard() {
    boardEl.innerHTML = "";

    const selectedMoves = selectedSquare
      ? turnLegalMoves.filter((mv) => mv.from.r === selectedSquare.r && mv.from.c === selectedSquare.c)
      : [];

    const whiteInCheck = isInCheck(gameState, "w");
    const blackInCheck = isInCheck(gameState, "b");

    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const sqBtn = document.createElement("button");
        sqBtn.type = "button";
        sqBtn.className = `square ${(r + c) % 2 === 0 ? "light" : "dark"}`;
        sqBtn.dataset.r = String(r);
        sqBtn.dataset.c = String(c);
        sqBtn.setAttribute("role", "gridcell");

        if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) {
          sqBtn.classList.add("selected");
        }

        const mv = selectedMoves.find((m) => m.to.r === r && m.to.c === c);
        if (mv) {
          sqBtn.classList.add(mv.capture || mv.isEnPassant ? "capture" : "move");
        }

        const piece = gameState.board[r][c];
        if (piece === "wK" && whiteInCheck) {
          sqBtn.classList.add("check");
        }
        if (piece === "bK" && blackInCheck) {
          sqBtn.classList.add("check");
        }

        if (mateSquare && mateSquare.r === r && mateSquare.c === c) {
          sqBtn.classList.add("mate");
        }

        if (piece) {
          const img = document.createElement("img");
          img.className = `piece ${pieceColor(piece) === "w" ? "piece-white" : "piece-black"}`;
          img.src = getPieceImagePath(piece);
          img.alt = piece;
          sqBtn.appendChild(img);
        }

        sqBtn.addEventListener("click", () => onSquareClick(r, c));
        boardEl.appendChild(sqBtn);
      }
    }
  }

  function resetGame() {
    gameState = createInitialState();
    selectedSquare = null;
    aiThinking = false;
    gameOver = false;
    mateSquare = null;

    turnLegalMoves = generateLegalMoves(gameState, gameState.turn);
    renderBoard();
    updateGameStatus();
    setBotPhrase(pickRandom(PHRASES.reset));
  }

  function rotateLogo() {
    logoIndex = (logoIndex + 1) % LOGO_FRAMES.length;
    logoFrameEl.src = LOGO_FRAMES[logoIndex];
  }

  resetBtn.addEventListener("click", resetGame);

  difficultySelect.addEventListener("change", () => {
    const level = difficultySelect.value;
    aiDepth = AI_DEPTH_BY_LEVEL[level] || AI_DEPTH_BY_LEVEL.medium;
    aiDelayWindow = AI_DELAY_BY_LEVEL[level] || AI_DELAY_BY_LEVEL.medium;
  });

  setInterval(rotateLogo, 420);

  // Start
  turnLegalMoves = generateLegalMoves(gameState, gameState.turn);
  renderBoard();
  updateGameStatus();
  setBotPhrase("Vamos jogar. Estou de pretas hoje.");
})();
