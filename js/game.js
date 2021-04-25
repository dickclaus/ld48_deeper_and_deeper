function ld48game(optionsParam) {
    var options = optionsParam || {}
    var board;
    var depth = 1;
    var engineStatus = {};
    var isEngineRunning = false;
    var displayScore = true;
    var evaluation_el = document.getElementById("evaluation");

    var engine = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'stockfish.js');
    var evaler = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'stockfish.js');

    var game = new Chess();
    var playerColor = 'white';
    var onDragStart = function(source, piece, position, orientation) {
        var re = playerColor === 'white' ? /^b/ : /^w/
        if (game.game_over() ||
            piece.search(re) !== -1) {
            return false;
        }
    };

    function displayStatus() {
        var status = 'Engine: ';
        if(!engineStatus.engineLoaded) {
            status += 'loading...';
        } else if(!engineStatus.engineReady) {
            status += 'loaded...';
        } else {
            status += 'ready.';
        }

        if(engineStatus.search) {
            status += '<br>' + engineStatus.search;
            if(engineStatus.score && displayScore) {
                status += (engineStatus.score.substr(0, 4) === "Mate" ? " " : ' Score: ') + engineStatus.score;
            }
        }
        $('#engineStatus').html(status);
    }

    function uciCmd(cmd, which) {
        console.log("UCI: " + cmd);

        (which || engine).postMessage(cmd);
    }
    uciCmd('uci');

    var tryAgain = function() {
        var startBtn = $('#startBtn');
        startBtn.prop("disabled", true);
        var tryAgainObj = $('.try-again');
        tryAgainObj.text('No mate in ' + depth);
        tryAgainObj.fadeIn(300).delay(500).fadeOut(300, function () {
            startBtn.prop('disabled', false);
        });
    }

    engine.onmessage = function(event) {
        var line;

        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }
        console.log("Reply: " + line)
        if(line === 'uciok') {
            engineStatus.engineLoaded = true;
        } else if(line === 'readyok') {
            engineStatus.engineReady = true;
        } else {
            var match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            /// Did the AI move?
            if(match) {
                isEngineRunning = false;
                //game.move({from: match[1], to: match[2], promotion: match[3]});
                //prepareMove();
                uciCmd("eval", evaler)
                evaluation_el.textContent = "";
                uciCmd("eval");
                /// Is it sending feedback?
            } else if(match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/)) {
                engineStatus.search = 'Depth: ' + match[1] + ' Nps: ' + match[2];
            }

            /// Is it sending feed back with a score?
            var regex = "^info .*\\bdepth " + depth + " .*\\bscore (\\w+) (-?\\d+)";
            var re = new RegExp(regex);
            match = line.match(re);
            if(match) {
                var score = parseInt(match[2]) * ($('input[name="move"]').val() === 'w' ? 1 : -1);
                /// Is it measuring in centipawns?
                if(match[1] === 'cp') {
                    engineStatus.score = (score / 100.0).toFixed(2);
                    tryAgain();
                    /// Did it find a mate?
                } else if(match[1] === 'mate') {
                    engineStatus.score = 'Mate in ' + Math.abs(score);
                    if (Math.abs(score) === depth) {
                        var startBtn = $('#startBtn');
                        var congratulations = $('.congratulations');
                        startBtn.prop("disabled", true);
                        congratulations.text('Congratulations: Mate in ' + depth);
                        congratulations.fadeIn(300).delay(2000).fadeOut(300, function () {
                            startBtn.prop('disabled', false);
                            depth += 1;
                            document.getElementsByClassName('level')[0].textContent = 'Level ' + depth;
                        });
                    } else {
                        tryAgain();
                    }
                }
            }
        }
        displayStatus();
    }

    evaler.onmessage = function(event) {
        var line;

        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }

        console.log("evaler: " + line);

        /// Ignore some output.
        if (line === "uciok" || line === "readyok" || line.substr(0, 11) === "option name") {
            return;
        }

        evaluation_el.textContent = "";
        if (evaluation_el.textContent) {
            evaluation_el.textContent += "\n";
        }
        evaluation_el.textContent += line;
    }

    var onDrop = function(source, target) {
        // see if the move is legal
        var move = game.move({
            from: source,
            to: target,
            // always promote to queen
            promotion: "q"
        });

        // illegal move
        //if (move === null) return 'snapback';

        //prepareMove();
    };

    var onSnapEnd = function() {
        board.position(game.fen());
    };

    var cfg = {
        // pieceTheme: 'img/chesspieces/alpha/{piece}.png',
        draggable: true,
        dropOffBoard: 'trash',
        sparePieces: true
    };

    function get_moves() {
        var moves = '';
        var history = game.history({verbose: true});

        for(var i = 0; i < history.length; ++i) {
            var move = history[i];
            moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
        }

        return moves;
    }

    //var savedPosition = '5rk1/5ppp/8/8/4B2Q/8/8/8';
    var savedPosition = 'rnbq1r1k/pp1npPbp/3p4/4P3/5P2/2p2N2/PPP3P1/R1BQKB1R';
    var mateIn3 = 'r5nr/pp2bppp/5k2/3Qp1q1/4P3/2P5/5PPP/RN3RK1';
    var mateIn5 = '2q1nk1r/4Rp2/1ppp1P2/6Pp/3p1B2/3P3P/PPP1Q3/6K1';
    var mateIn6 = 'rnbq1r1k/pp1npPbp/3p4/4P3/5P2/2p2N2/PPP3P1/R1BQKB1R'

    var evaluate = function() {
        console.log(board.position());
        console.log(board.fen());
        console.log(board.orientation());
        var toMove = $('input[name="move"]:checked').val();
        uciCmd('position fen ' + board.fen() + ' ' + toMove + ' KQ - 0 1')
        uciCmd('go depth ' + depth);
        //uciCmd('position startpos moves' + get_moves(), evaler);
    };

    var savePosition = function() {
        savedPosition = board.fen();
    }

    var loadPosition = function() {
        board.position(savedPosition);
    }

    board = new ChessBoard('board', cfg);
    //board = new ChessBoard('board', '5RK1/5PPP/8/8/4b2q/8/8/8')
    $('#startBtn').on('click', evaluate)
    $('#clearBtn').on('click', board.clear)
    $('#saveBtn').on('click', savePosition)
    $('#loadBtn').on('click', loadPosition)
    $('#flipOrientationBtn').on('click', board.flip)
}