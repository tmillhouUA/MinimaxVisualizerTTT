//Visualization Settings

const COLOR_WIN  = { vibrant: "rgb(50,180,50)",   desat: "rgb(105,180,105)", bg: "rgb(38,62,38)"  }
const COLOR_LOSE = { vibrant: "rgb(180,50,50)",   desat: "rgb(180,105,105)", bg: "rgb(62,38,38)"  }
const COLOR_DRAW = { vibrant: "rgb(50,50,180)",   desat: "rgb(105,105,180)", bg: "rgb(38,38,62)"  }

function mmColor(v, shade){ return v === 1 ? COLOR_WIN[shade] : v === -1 ? COLOR_LOSE[shade] : COLOR_DRAW[shade] }

const width = 1835
const topPadding = 10
const scrollbarHeight = 17
const height = window.innerHeight - topPadding - scrollbarHeight
const boardSize = 45
const colPadding = 20
const sidePadding = 125

//Game, Tree, and Algorithm Settings

// ── Board encoding ────────────────────────────────────────────────────────
// O = +1  (MAX player — tries to maximise utility)
// X = -1  (MIN player — tries to minimise utility)
// empty = 0
// Terminal utilities: O wins → +1,  X wins → -1,  draw → 0
// turnCounter(board) returns [moveNumber, playerToMoveNext]
//   playerToMoveNext is +1 (O) or -1 (X)
// ─────────────────────────────────────────────────────────────────────────

let forced = true
let useSymmetry = true
let useAlphaBeta = true
let moveOrdering = 'heuristic'  // 'heuristic' | 'off' | 'reversed'


//Create SVG

const svg = d3.select('#viz').append('svg').attr("width",width).attr("height",height)
const treeLayer = svg.append("g").attr("transform",`translate(0 ${topPadding})`)
//Create Visualization Functions/Elements

function getBlankBoard(){
    const board = []
    for(let i=0; i<3;i++){
        board[i] = []
        for(let j=0; j<3;j++){
                board[i][j] = 0
        }
    }
    return board
    }

function cloneBoard(board){ return board.map(row => row.slice()) }

class GridTTT{
    constructor({board=getBlankBoard(),locX=0,locY=0,target=treeLayer,edge=boardSize,background="rgb(225,225,225)",line="rgb(50,50,50)",lastmove=[null,null],mmValue=null}){
        this.locX = locX - edge/2
        this.locY = locY - edge/2
        this.edge = edge
        this.board = board
        this.target = target
        this.line = line
        this.background = background
        this.lastmove = lastmove
        this.mmValue = mmValue
        this.group = target.append("g").attr("transform",`translate(${this.locX} ${this.locY})`)

        this.field = null
        this.gridPath = null
        this.grid = null
        this.glyphs = getBlankBoard()  //Uses a blank board since it has the same 2d array structure needed for the glyphs representation
    }

    // Returns {terminal, utility, path}
    // O = +1 (MAX player, utility +1 on O win)
    // X = -1 (MIN player, utility -1 on X win)
    // Draw = 0
    isTerminal(board = this.board){
        const e = this.edge
        const cx = (i) => e/6 + i*e/3
        const cy = (j) => e/6 + j*e/3
        let boardSum = 0

        //Check Columns (i = column, j = row)
        for(let i=0; i<3;i++){
            let colSum = 0
            for(let j=0; j<3;j++){
                colSum += board[i][j]
                boardSum += Math.abs(board[i][j])
            }
            if(Math.abs(colSum)==3){
                const path = `M ${cx(i)} ${cy(0)} L ${cx(i)} ${cy(2)}`
                return {terminal: true, utility: Math.sign(colSum), path}
            }
        }

        //Check Full
        if(boardSum === 9){
            const path = `M ${cx(0)} ${cy(0)} L ${cx(2)} ${cy(2)} M ${cx(2)} ${cy(0)} L ${cx(0)} ${cy(2)}`
            return {terminal: true, utility: 0, path}
        }

        //Check Rows (j = row, i = column)
        for(let j=0; j<3;j++){
            let rowSum = 0
            for(let i=0; i<3;i++){
                rowSum += board[i][j]
            }
            if(Math.abs(rowSum)==3){
                const path = `M ${cx(0)} ${cy(j)} L ${cx(2)} ${cy(j)}`
                return {terminal: true, utility: Math.sign(rowSum), path}
            }
        }

        //Check Diagonals
        let downDiagSum = board[0][0] + board[1][1] + board[2][2]
        if(Math.abs(downDiagSum)==3){
            const path = `M ${cx(0)} ${cy(0)} L ${cx(2)} ${cy(2)}`
            return {terminal: true, utility: Math.sign(downDiagSum), path}
        }

        let upDiagSum = board[2][0] + board[1][1] + board[0][2]
        if(Math.abs(upDiagSum)==3){
            const path = `M ${cx(2)} ${cy(0)} L ${cx(0)} ${cy(2)}`
            return {terminal: true, utility: Math.sign(upDiagSum), path}
        }

        return {terminal: false, utility: null, path: null}
    }

    // Returns [moveNumber, playerToMoveNext] where playerToMoveNext is +1 (O) or -1 (X).
    // moveNumber = total pieces already placed + 1 (i.e., the upcoming move number).
    turnCounter(board = this.board){
        let boardSum = 0
        for(let i=0; i<3;i++){
            for(let j=0; j<3;j++){
                boardSum += Math.abs(board[i][j])
            }
        }

        let turn = -1
        // Even number of pieces placed → O moves next (O always goes first)
        if(boardSum % 2 === 0) turn = 1

        return [boardSum + 1, turn]
    }

    getSuccessors(board=this.board){
        const player=this.turnCounter(board)[1]
        const successors = []
            for(let i=0; i<3;i++){
                for(let j=0; j<3;j++){
                    if(board[i][j] === 0){
                        const next = cloneBoard(board)
                        next[i][j] = player
                        successors.push({board: next, move: [i,j]})
                    }
                }
            }
        return(successors)
    }

    boardToString(board=this.board) {
        // Convert 3x3 grid to string for comparison
        return board.flat().join(',');
    }

    rotate90(board=this.board) {
        // Rotate 90 degrees clockwise
        return [[board[2][0], board[1][0], board[0][0]],
                [board[2][1], board[1][1], board[0][1]],
                [board[2][2], board[1][2], board[0][2]]
                ];
    }

    flipHorizontal(board=this.board){
        // Flip horizontally (mirror left-right)
        return board.map(row => [...row].reverse());
    }

    getAllSymmetries(board=this.board){
        // Generate all 8 symmetries
        const symmetries = [];
        let current = board;

        // 4 rotations
        for (let i = 0; i < 4; i++) {
            symmetries.push(current);
            symmetries.push(this.flipHorizontal(current));
            current = this.rotate90(current);
        }

        return symmetries;
    }

    getCanonical(board=this.board){
        // Get canonical form (lexicographically smallest)
        const symmetries = this.getAllSymmetries(board);
        return symmetries
            .map(this.boardToString)
            .sort()
            .at(0); // First alphabetically
    }

    // Keeps only one representative per equivalence class under the 8 rotations/reflections
    // of the board. When multiple moves reach the same canonical form, the first encountered
    // (in row-major order from getSuccessors) is kept.
    deduplicateBoards(boards) {
        const seen = new Map();
        for (const s of boards) {
            const canonical = this.getCanonical(s.board);
            if (!seen.has(canonical)) {
                seen.set(canonical, s);
            }
        }
        return Array.from(seen.values());
    }

    getUniqueSuccessors(board=this.board, forced=true){
        const rawSuccessors = this.getSuccessors(board)
        let uniqueSuccessors = new Set();
        if(forced){
            // Forced-move filter:
            //   1. If any move wins immediately, return only that move.
            //   2. Otherwise, remove any move that lets the opponent win on the very next turn.
            //   3. If every move allows an opponent win, return the last move (no good option exists).
            for(const s of rawSuccessors){
                const result = this.isTerminal(s.board)
                if(result.terminal){
                    // immediate win (or draw) — if it's a win, return only this move
                    if(result.utility !== 0){
                        uniqueSuccessors.clear()
                        uniqueSuccessors.add(s)
                        break
                    }
                    uniqueSuccessors.add(s)
                } else {
                    const nextSuccessors = this.getSuccessors(s.board)
                    const opponentCanWin = nextSuccessors.some(ns => {
                        const r = this.isTerminal(ns.board)
                        return r.terminal && r.utility !== 0
                    })
                    if(!opponentCanWin) uniqueSuccessors.add(s)
                }
            }
            // if all moves allow opponent to win, keep the last one
            if(uniqueSuccessors.size === 0) uniqueSuccessors.add(rawSuccessors[rawSuccessors.length - 1])
        }else{
            uniqueSuccessors = new Set(rawSuccessors)
        }

        return useSymmetry ? this.deduplicateBoards(uniqueSuccessors) : Array.from(uniqueSuccessors)
    }

    place(gridX, gridY, rememberMove=true){
        const player=this.turnCounter(this.board)[1]
        this.board[gridX][gridY] = player
        if(rememberMove){
            this.lastmove = [gridX,gridY]
        }
        return this.board
    }

    drawBoard(board=this.board, highlightLastMove=true,showWin=true){

        this.field = this.group.append("rect")
                            .attr("x",-2)
                            .attr("y",-2)
                            .attr("width",this.edge+4)
                            .attr("height",this.edge+4)
                            .attr("stroke","rgb(128, 128, 128)")
                            .attr("fill",this.background)
                            .attr("rx",this.edge/18)
                            .attr("stroke-width", "3px")

        this.gridPath = `M ${this.edge/3} 0 L ${this.edge/3} ${this.edge} M ${2*this.edge/3} 0 L ${2*this.edge/3} ${this.edge} `
        this.gridPath += `M 0 ${this.edge/3} L ${this.edge} ${this.edge/3} M 0 ${2*this.edge/3} L ${this.edge} ${2*this.edge/3}`
        this.grid = this.group.append("path").attr("stroke",this.line)
                                .attr("d",this.gridPath)
                                .attr("stroke-width", Math.max(this.edge*.03,1))

        if(Array.isArray(highlightLastMove)){
                    this.lastmove = highlightLastMove
                }

        for(let i=0; i<3;i++){
            for(let j=0; j<3;j++){
                const value = this.board[i][j]
                const isHighlight = highlightLastMove && this.lastmove[0]===i && this.lastmove[1]===j
                const highlightColor = value === 1 ? COLOR_WIN.vibrant : COLOR_LOSE.vibrant
                const glyphColor = isHighlight ? highlightColor : this.line
                if(value === 1){
                    this.glyphs[i][j] = this.group.append("circle").attr("cx",this.edge/6 + i*this.edge/3)
                                                                .attr("cy",this.edge/6 + j*this.edge/3)
                                                                .attr("r", this.edge/8.25)
                                                                .attr("stroke-width", Math.max(this.edge*.03,1))
                                                                .attr("fill", "rgba(0,0,0,0)")
                                                                .attr("stroke", glyphColor)
                }
                if(value === -1){
                    let xPath = `M ${this.edge/18 +this.edge/3 *i} ${this.edge/18 +this.edge/3 *j} `
                    xPath += `L ${5*this.edge/18 +this.edge/3 *i} ${5*this.edge/18 +this.edge/3 *j}`
                    xPath += `M ${5*this.edge/18 +this.edge/3 *i} ${this.edge/18 +this.edge/3 *j}`
                    xPath += `L ${this.edge/18 +this.edge/3 *i} ${5*this.edge/18 +this.edge/3 *j}`
                    this.glyphs[i][j] = this.group.append("path").attr("d",xPath)
                                                                .attr("stroke-width", Math.max(this.edge*.03,1))
                                                                .attr("fill", "rgba(0,0,0,0)")
                                                                .attr("stroke", glyphColor)
                }
            }
        }

        if(showWin){
            const result = this.isTerminal()
            if(result.terminal){
                const winColor = mmColor(result.utility, 'vibrant')
                this.field.attr("stroke",winColor)
                this.group.append("path")
                    .attr("d", result.path)
                    .attr("stroke", winColor)
                    .attr("stroke-width", "2px")
                    .attr("stroke-linecap", "round")
                    .attr("fill", "none")
                const label = result.utility === 1 ? "+1" : result.utility === -1 ? "-1" : "0"
                this.group.append("text")
                    .attr("x", this.edge / 2)
                    .attr("y", this.edge + 7 + 12)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "auto")
                    .attr("font-family", "sans-serif")
                    .attr("font-size", "15px")
                    .attr("font-weight", "bold")
                    .attr("fill", winColor)
                    .text(label)
            } else if(this.mmValue !== null){
                this.field.attr("stroke", mmColor(this.mmValue, 'desat'))
            }
        }
    }

    // Heuristic score for move ordering. Higher = played earlier.
    // Winning move (completes a line of 3): Infinity.
    // Extends an unblocked line the player already has two pieces in: +1 per such line.
    // Blocks a line the opponent already has pieces in: +1 per opponent piece in that line.
    scoreMove(board, move){
        const [i, j] = move
        const [, player] = this.turnCounter(board)
        const opponent = -player
        const lines = [
            [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]], // columns
            [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]], // rows
            [[0,0],[1,1],[2,2]], [[2,0],[1,1],[0,2]]                        // diagonals
        ]
        let score = 0
        for(const line of lines){
            if(!line.some(([r,c]) => r === i && c === j)) continue
            let playerCount = 0, opponentCount = 0
            for(const [r,c] of line){
                if(r === i && c === j) continue // count pre-move state
                if(board[r][c] === player) playerCount++
                else if(board[r][c] === opponent) opponentCount++
            }
            if(opponentCount === 0 && playerCount === 2) return Infinity // winning move
            if(opponentCount === 0 && playerCount === 1) score++ // opportunity opened
            if(playerCount === 0 && opponentCount > 0) score += opponentCount // line blocked
        }
        return score
    }

    getSortedSuccessors(board, baseSuccFunc){
        const succs = baseSuccFunc(board)
        return succs.slice().sort((a, b) => this.scoreMove(board, b.move) - this.scoreMove(board, a.move))
    }

    getInvertedSuccessors(board, baseSuccFunc){
        return this.getSortedSuccessors(board, baseSuccFunc).reverse()
    }

    // The tree is constructed via BFS so that all nodes persist in memory and can be rendered
    // layer by layer. minimax is a standalone reference implementation that — as is typical —
    // traverses and discards nodes as recursive calls resolve. abMark and mmMark reimplement
    // the same minimax logic but operate directly on the pre-built tree nodes, writing mmValue
    // and pruned onto each node in place.
    minimax(board = this.board, alpha = -Infinity, beta = Infinity, alphaBeta = false){
        const { terminal, utility } = this.isTerminal(board)
        if(terminal) return utility

        const [, player] = this.turnCounter(board)
        const succs = this.getSuccessors(board)

        if(player === 1){ // MAX (O)
            let value = -Infinity
            for(const s of succs){
                value = Math.max(value, this.minimax(s.board, alpha, beta, alphaBeta))
                if(alphaBeta){
                    alpha = Math.max(alpha, value)
                    if(value >= beta) break
                }
            }
            return value
        } else { // MIN
            let value = Infinity
            for(const s of succs){
                value = Math.min(value, this.minimax(s.board, alpha, beta, alphaBeta))
                if(alphaBeta){
                    beta = Math.min(beta, value)
                    if(value <= alpha) break
                }
            }
            return value
        }
    }
}

const minGap = colPadding
const groupGap = 2 * colPadding

function edgeColor(v){ return mmColor(v, 'desat') }

function dfsLeaves(node, result = []){
    if(node.children.length === 0){ result.push(node); return result }
    for(const child of node.children) dfsLeaves(child, result)
    return result
}

// Annotates each node in the pre-built tree with its minimax value (node.mmValue) and
// marks every visited node as not pruned (node.pruned = false). Any node left with
// node.pruned = true after this call was never reached and will be greyed out.
//
// alpha: the best value MAX is guaranteed from any ancestor — MAX won't accept less.
// beta:  the best value MIN is guaranteed from any ancestor — MIN won't accept more.
// A MAX node cuts when value >= beta: MIN already has a choice no worse than beta,
//   so it would never let play reach this node with a higher value.
// A MIN node cuts when value <= alpha: MAX already has a choice no worse than alpha,
//   so it would never let play reach this node with a lower value.
function abMark(node, alpha, beta, ref){
    node.pruned = false
    const { terminal, utility } = ref.isTerminal(node.board)
    if(terminal){ node.mmValue = utility; return utility }
    const [, player] = ref.turnCounter(node.board)
    let value
    if(player === 1){ // MAX (O)
        value = -Infinity
        for(const child of node.children){
            value = Math.max(value, abMark(child, alpha, beta, ref))
            alpha = Math.max(alpha, value)
            if(value >= beta) break  // MIN would never choose this branch
        }
    } else { // MIN
        value = Infinity
        for(const child of node.children){
            value = Math.min(value, abMark(child, alpha, beta, ref))
            beta = Math.min(beta, value)
            if(value <= alpha) break  // MAX would never choose this branch
        }
    }
    node.mmValue = value
    return value
}

// Rebuild state accessible to event handlers across calls
let _separators = []
let _rowLabels = []
let _selectedRow = null
let _rowIsMax = []
// Ordered sequence of playback events built in buildTree().
//   { type: 'visit',  node, terminal } — node becomes visible; terminal nodes also get
//                                        their final border colour here (no separate return)
//   { type: 'return', node }           — non-terminal's minimax value is known; recolour border/edge
//   { type: 'prune',  nodes }          — entire pruned subtree appears at once (nodes[0] is root)
let _stepEvents = []
let _stepIndex = 0

function buildTree(){
    if(_playTimer){ clearTimeout(_playTimer); _playTimer = null }
    if(_playState !== 'stopped') setPlayState('stopped')
    treeLayer.selectAll("*").remove()
    document.getElementById('rowlabels').innerHTML = ''
    _separators = []
    _rowLabels = []
    _selectedRow = null
    _stepEvents = []
    _stepIndex = 0

    const boardForTree = cloneBoard(_initBoard)
    const ref = new GridTTT({ locX: 50, locY: 50, board: boardForTree })
    const baseSuccFunc = (board) => ref.getUniqueSuccessors(board, forced)
    const succFunc = (board) => {
        if(moveOrdering === 'heuristic') return ref.getSortedSuccessors(board, baseSuccFunc)
        if(moveOrdering === 'reversed')  return ref.getInvertedSuccessors(board, baseSuccFunc)
        return baseSuccFunc(board)
    }

    // Build tree
    const rootNode = { board: ref.board, children: [], parent: null, x: 0, y: 0 }
    const levels = [[rootNode]]
    let currentLevel = [rootNode]
    while(currentLevel.length > 0){
        const nextLevel = []
        for(const node of currentLevel){
            if(!ref.isTerminal(node.board).terminal){
                for(const s of succFunc(node.board)){
                    const child = { board: s.board, move: s.move, children: [], parent: node, x: 0, y: 0, pruned: true }
                    node.children.push(child)
                    nextLevel.push(child)
                }
            }
        }
        if(nextLevel.length > 0) levels.push(nextLevel)
        currentLevel = nextLevel
    }

    // Alpha-beta
    if(useAlphaBeta){
        abMark(levels[0][0], -Infinity, Infinity, ref)
    } else {
        for(const lvl of levels)
            for(const node of lvl){ node.pruned = false; node.mmValue = null }
        // compute mmValues without pruning
        function mmMark(node){
            const { terminal, utility } = ref.isTerminal(node.board)
            if(terminal){ node.mmValue = utility; return utility }
            const [, player] = ref.turnCounter(node.board)
            const vals = node.children.map(mmMark)
            node.mmValue = player === 1 ? Math.max(...vals) : Math.min(...vals)
            return node.mmValue
        }
        mmMark(levels[0][0])
    }
    const totalNodes = levels.reduce((sum, lvl) => sum + lvl.length, 0)
    const prunedNodes = levels.reduce((sum, lvl) => sum + lvl.filter(n => n.pruned).length, 0)
    const leafCount = levels.reduce((sum, lvl) => sum + lvl.filter(n => n.children.length === 0).length, 0)

    // Layout
    // Step 1: Assign y-positions by depth; place leaves left-to-right in DFS order.
    //         Siblings share a narrower gap (minGap); nodes from different parents get a
    //         wider gap (groupGap) to visually separate subtrees.
    // Step 2: SVG width is determined by the rightmost leaf's position.
    // Step 3: Non-leaf x-positions propagate bottom-up as the midpoint of their children.
    // Step 4: Center the root over the full leaf span; also center a lone level-1 node.
    const rowHeight = Math.floor(height / levels.length)
    _rowIsMax = levels.map(lvl => ref.turnCounter(lvl[0].board)[1] === 1)

    for(let d = 0; d < levels.length; d++)
        for(const node of levels[d]) node.y = d * rowHeight + rowHeight / 2

    const leaves = dfsLeaves(levels[0][0])
    let cursor = sidePadding
    for(let k = 0; k < leaves.length; k++){
        if(k > 0){
            cursor += leaves[k].parent === leaves[k-1].parent ? minGap : groupGap
            cursor += boardSize
        }
        leaves[k].x = cursor + boardSize / 2
    }

    const lastLeaf = leaves[leaves.length - 1]
    const treeHeight = levels.length * rowHeight
    const svgWidth = lastLeaf.x + boardSize / 2 + sidePadding
    svg.attr("width", svgWidth).attr("height", window.innerHeight - scrollbarHeight)

    // Step 3: Bottom-up propagation
    for(let d = levels.length - 1; d >= 1; d--){
        const lvl = levels[d]
        for(const node of lvl){
            if(node.children.length > 0){
                const xs = node.children.map(c => c.x)
                node.x = (Math.min(...xs) + Math.max(...xs)) / 2
            }
        }
        const nonLeaves = lvl.filter(n => n.children.length > 0)
        for(let k = 1; k < nonLeaves.length; k++){
            const gap = nonLeaves[k].parent !== nonLeaves[k-1].parent ? groupGap : minGap
            const minX = nonLeaves[k-1].x + boardSize + gap
            if(nonLeaves[k].x < minX) nonLeaves[k].x = minX
        }
    }
    levels[0][0].x = (leaves[0].x + lastLeaf.x) / 2
    if(levels.length > 1 && levels[1].length === 1) levels[1][0].x = levels[0][0].x

    // Highlights the row separator lines and row labels for the currently active depth d.
    // Closes over _separators, _rowLabels, and _rowIsMax populated earlier in this buildTree call.
    function rowEmphasisColor(d){ return _rowIsMax[d] ? COLOR_WIN.desat : COLOR_LOSE.desat }
    function rowBgColor(d){ return _rowIsMax[d] ? COLOR_WIN.bg : COLOR_LOSE.bg }
    function applyEmphasis(d){
        _separators.forEach((line, i) => {
            const emphasized = d !== null && (i === d || i === d + 1)
            line.attr("stroke", emphasized ? rowEmphasisColor(d) : "rgba(255,255,255,.25)")
                .attr("stroke-width", emphasized ? 2 : 1)
        })
        _rowLabels.forEach((label, i) => {
            label.style.backgroundColor = (d !== null && i === d) ? rowEmphasisColor(d) : rowBgColor(i)
        })
    }

    // Separator lines
    for(let i = 0; i <= levels.length; i++){
        const line = treeLayer.append("line")
            .attr("x1", 0).attr("y1", i * rowHeight)
            .attr("x2", svgWidth).attr("y2", i * rowHeight)
            .attr("stroke", "rgba(255,255,255,.25)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "4,6")
        _separators.push(line)
    }

    // Background rect for deselection clicks
    treeLayer.insert("rect", ":first-child")
        .attr("x", 0).attr("y", 0)
        .attr("width", svgWidth).attr("height", treeHeight)
        .attr("fill", "transparent")
        .on("click", function(){
            const clickY = d3.event.offsetY - topPadding
            if(_selectedRow !== null){
                const rowTop = _selectedRow * rowHeight
                const rowBot = (_selectedRow + 1) * rowHeight
                if(clickY >= rowTop && clickY < rowBot) return
            }
            _selectedRow = null
            applyEmphasis(null)
        })

    _separators.forEach((line, i) => {
        line.style("cursor", "pointer").on("click", function(){
            d3.event.stopPropagation()
            if(_selectedRow !== null && (i === _selectedRow || i === _selectedRow + 1)) return
            _selectedRow = null
            applyEmphasis(null)
        })
    })

    // Row label tabs
    const rowLabelsDiv = document.getElementById('rowlabels')
    for(let d = 0; d < levels.length; d++){
        const isMax = _rowIsMax[d]
        const label = document.createElement('div')
        label.className = 'rowlabel'
        label.style.top = (topPadding + d * rowHeight + rowHeight / 2) + 'px'
        label.style.height = rowHeight + 'px'
        label.style.backgroundColor = isMax ? COLOR_WIN.bg : COLOR_LOSE.bg
        label.style.color = 'rgba(255,255,255,.75)'
        label.style.cursor = 'pointer'
        for(const ch of (isMax ? 'MAX' : 'MIN')){
            const span = document.createElement('span')
            span.textContent = ch
            label.appendChild(span)
        }
        label.addEventListener('click', (function(depth){
            return function(){
                _selectedRow = _selectedRow === depth ? null : depth
                applyEmphasis(_selectedRow)
            }
        })(d))
        rowLabelsDiv.appendChild(label)
        _rowLabels.push(label)
    }

    // Edges — store selection on each child node
    const edgeLayer = treeLayer.insert("g", ":first-child")
    for(const lvl of levels)
        for(const node of lvl)
            for(const child of node.children){
                child.edgeSel = edgeLayer.append("line")
                    .attr("x1", node.x).attr("y1", node.y + boardSize / 2 + 2)
                    .attr("x2", child.x).attr("y2", child.y - boardSize / 2 - 2)
                    .attr("stroke", "rgb(128,128,128)")
                    .attr("stroke-width", 2)
                    .attr("opacity", 0.25)
            }

    // Boards — store GridTTT instance on node
    for(const lvl of levels)
        for(const node of lvl){
            const g = new GridTTT({ board: node.board, locX: node.x, locY: node.y, target: treeLayer, lastmove: node.move, mmValue: node.mmValue })
            g.drawBoard()
            if(node.pruned) g.group.attr("opacity", 0.25)
            node.gridInst = g
        }

    // Apply mmValue colors to edges now that all nodes are drawn; restore full opacity
    for(const lvl of levels)
        for(const node of lvl)
            if(node.edgeSel && node.mmValue !== null)
                node.edgeSel.attr('stroke', edgeColor(node.mmValue)).attr('opacity', node.pruned ? 0.25 : 1)

    // Build step events via DFS over already-computed tree
    _stepEvents = []

    // Collect all nodes in the subtree rooted at n (root first, depth-first).
    function collectSubtree(n){
        const result = [n]
        n.children.forEach(c => result.push(...collectSubtree(c)))
        return result
    }

    // Build _stepEvents by mirroring the DFS order of the minimax algorithm:
    //   visit → recurse children (or emit prune for cut branches) → return
    function buildEvents(node){
        const isTerminal = ref.isTerminal(node.board).terminal
        _stepEvents.push({ type: 'visit', node, terminal: isTerminal })
        if(!isTerminal){
            for(const child of node.children){
                if(child.pruned){
                    _stepEvents.push({ type: 'prune', nodes: collectSubtree(child) })
                } else {
                    buildEvents(child)
                }
            }
            _stepEvents.push({ type: 'return', node })
        }
    }
    buildEvents(levels[0][0])

    // Stats panel
    const statsTable = document.getElementById('stats-table')
    statsTable.innerHTML = ''
    function statRow(label, value){
        const row = document.createElement('div')
        row.className = 'stat-row'
        row.innerHTML = `<span class="stat-label">${label}</span><span class="stat-value">${value}</span>`
        statsTable.appendChild(row)
    }
    statRow('Total nodes:', totalNodes)
    statRow('Leaf nodes:', leafCount)    
    const prunedPct = useAlphaBeta ? `${(100 * prunedNodes / totalNodes).toFixed(1)}%` : 'N/A'
    statRow('Pruned:', prunedPct)
    statsTable.appendChild(document.createElement('div')) // spacer
    levels.forEach((lvl, d) => statRow(`Row ${d} Nodes:`, lvl.length))
}

// Playback state machine
let _playState = 'stopped'   // 'stopped' | 'playing' | 'paused'
let _playTimer = null
let _playSpeed = 3           // fps, 1–10

const _controlSections = [
    'initial-state-section', 'minimax-settings-section',
    'tree-filtering-section', 'actions-section'
]


function eachNode(fn){
    // walk all unique nodes via visit events
    for(const evt of _stepEvents)
        if(evt.type === 'visit') fn(evt.node)
        else if(evt.type === 'prune') evt.nodes.forEach(fn)
}

function hideAllExceptRoot(){
    eachNode(n => {
        const hide = n.parent !== null
        n.gridInst.group.attr('opacity', hide ? 0 : 1)
        if(n.edgeSel){
            n.edgeSel.attr('opacity', 0)
            n.edgeSel.attr('stroke', 'rgb(128,128,128)')
        }
        // reset border to gray, dimmed until return event
        n.gridInst.field.attr('stroke', 'rgb(128,128,128)').attr('stroke-opacity', n.parent !== null ? 0.25 : 1)
    })
    // terminal nodes always show their vibrant outline once visible
    for(const evt of _stepEvents){
        if(evt.type === 'visit'){
            const result = evt.node.gridInst.isTerminal()
            if(result.terminal) evt.node.gridInst.field.attr('stroke', mmColor(result.utility, 'vibrant'))
        }
    }
}

function showFullTree(){
    eachNode(n => {
        const op = n.pruned ? 0.25 : 1
        n.gridInst.group.attr('opacity', op)
        if(n.edgeSel){
            n.edgeSel.attr('opacity', op)
            if(n.mmValue !== null) n.edgeSel.attr('stroke', edgeColor(n.mmValue))
        }
        // reapply return coloring for non-terminals; always restore full border opacity
        n.gridInst.field.attr('stroke-opacity', 1)
        if(!n.gridInst.isTerminal().terminal && n.mmValue !== null)
            n.gridInst.field.attr('stroke', mmColor(n.mmValue, 'desat'))
    })
}

function flashEmphasis(field, edge, normalFieldStroke, normalEdgeStroke){
    const flashDuration = 500 / _playSpeed  // half the frame time in ms
    field.attr('stroke-width', '6px')
    if(edge) edge.attr('stroke-width', 4)
    setTimeout(() => {
        field.attr('stroke-width', '3px')
        if(edge) edge.attr('stroke-width', 2)
        if(normalFieldStroke) field.attr('stroke', normalFieldStroke)
        if(normalEdgeStroke && edge) edge.attr('stroke', normalEdgeStroke)
    }, flashDuration)
}

function applyStep(idx){
    const evt = _stepEvents[idx]
    if(!evt) return
    if(evt.type === 'visit'){
        const op = evt.node.pruned ? 0.25 : 1
        evt.node.gridInst.group.attr('opacity', op)
        // Edge and field border appear dimmed (gray) until the return event sets their final color
        if(evt.node.edgeSel) evt.node.edgeSel.attr('opacity', 0.25)
        evt.node.gridInst.field.attr('stroke-opacity', 0.25)
        if(evt.terminal && evt.node.mmValue !== null){
            const finalEdgeStroke = edgeColor(evt.node.mmValue)
            if(evt.node.edgeSel) evt.node.edgeSel.attr('stroke', finalEdgeStroke).attr('opacity', op)
            evt.node.gridInst.field.attr('stroke-opacity', 1)
            flashEmphasis(evt.node.gridInst.field, evt.node.edgeSel, null, finalEdgeStroke)
        } else {
            flashEmphasis(evt.node.gridInst.field, evt.node.edgeSel, null, null)
        }
    } else if(evt.type === 'return'){
        const result = evt.node.gridInst.isTerminal()
        let finalFieldStroke = null
        let finalEdgeStroke = null
        if(evt.node.mmValue !== null){
            if(!result.terminal){
                finalFieldStroke = mmColor(evt.node.mmValue, 'desat')
                evt.node.gridInst.field.attr('stroke', finalFieldStroke)
            }
            if(evt.node.edgeSel){
                finalEdgeStroke = edgeColor(evt.node.mmValue)
                evt.node.edgeSel.attr('stroke', finalEdgeStroke).attr('opacity', 1)
            }
        }
        evt.node.gridInst.field.attr('stroke-opacity', 1)
        flashEmphasis(evt.node.gridInst.field, evt.node.edgeSel, finalFieldStroke, finalEdgeStroke)
    } else if(evt.type === 'prune'){
        evt.nodes.forEach(n => {
            n.gridInst.group.attr('opacity', 0.25)
            if(n.edgeSel) n.edgeSel.attr('opacity', 0.25)
        })
        const root = evt.nodes[0]
        flashEmphasis(root.gridInst.field, root.edgeSel, null, null)
    }
}

function setPlayState(state){
    _playState = state
    const playing = state === 'playing'
    const active  = state !== 'stopped'

    document.getElementById('btn-play').textContent = playing ? '⏸' : '▶'
    document.getElementById('btn-stop').disabled = !active
    document.getElementById('rng-speed').disabled = playing

    // gray out all non-stats, non-playback controls
    _controlSections.forEach(id => {
        const el = document.getElementById(id)
        el.style.opacity = active ? '0.4' : ''
        el.style.pointerEvents = active ? 'none' : ''
    })
    // also disable initial board interaction
    _initSvg.style('pointer-events', active ? 'none' : null)
    _initSvg.style('opacity', active ? '0.4' : null)
}

function stopPlayback(){
    if(_playTimer){ clearTimeout(_playTimer); _playTimer = null }
    setPlayState('stopped')
    showFullTree()
}

function scheduleNext(){
    if(_playState !== 'playing') return
    _playTimer = setTimeout(() => {
        if(_playState !== 'playing') return
        applyStep(_stepIndex)
        _stepIndex++
        if(_stepIndex >= _stepEvents.length){
            setPlayState('stopped')
            showFullTree()
        } else {
            scheduleNext()
        }
    }, 1000 / _playSpeed)
}

document.getElementById('btn-play').addEventListener('click', () => {
    if(_playState === 'playing'){
        // pause
        if(_playTimer){ clearTimeout(_playTimer); _playTimer = null }
        setPlayState('paused')
    } else {
        // play or resume
        if(_playState === 'stopped'){
            _stepIndex = 0
            hideAllExceptRoot()
        }
        setPlayState('playing')
        scheduleNext()
    }
})

document.getElementById('btn-step').addEventListener('click', () => {
    if(_playState === 'playing'){
        if(_playTimer){ clearTimeout(_playTimer); _playTimer = null }
        setPlayState('paused')
    }
    if(_playState === 'stopped'){
        _stepIndex = 0
        hideAllExceptRoot()
        setPlayState('paused')
    }
    applyStep(_stepIndex)
    _stepIndex++
    if(_stepIndex >= _stepEvents.length){
        setPlayState('stopped')
        showFullTree()
    }
})

document.getElementById('btn-stop').addEventListener('click', stopPlayback)

document.getElementById('rng-speed').addEventListener('input', function(){
    _playSpeed = +this.value
    document.getElementById('speed-val').textContent = this.value
})

// Initial State board — default is blank board with O in center (matches buildTree default)
const _initBoardDefault = () => { const b = getBlankBoard(); b[1][1] = 1; return b }
let _initBoard = _initBoardDefault()
let _initHistory = []

const _initSvgSize = 150
const _initInset = 4  // padding so stroke doesn't clip at SVG edge
const _initSvg = d3.select('#initial-board-container').append('svg')
    .attr('width', _initSvgSize).attr('height', _initSvgSize)

function redrawInitBoard(){
    _initSvg.selectAll('*').remove()
    const inner = _initSvgSize - _initInset * 2
    const g = new GridTTT({
        board: cloneBoard(_initBoard),
        locX: _initInset + inner / 2, locY: _initInset + inner / 2,
        target: _initSvg, edge: inner,
        background: 'rgb(40,40,40)', line: 'rgb(120,120,120)'
    })
    g.drawBoard()

    // Hit targets — only if game not over
    if(!g.isTerminal().terminal){
        for(let i = 0; i < 3; i++){
            for(let j = 0; j < 3; j++){
                if(_initBoard[i][j] !== 0) continue
                _initSvg.append('rect')
                    .attr('x', _initInset + i * inner / 3)
                    .attr('y', _initInset + j * inner / 3)
                    .attr('width', inner / 3)
                    .attr('height', inner / 3)
                    .attr('fill', 'transparent')
                    .style('cursor', 'pointer')
                    .on('click', (function(ci, cj){
                        return function(){
                            _initHistory.push(cloneBoard(_initBoard))
                            const player = new GridTTT({ board: _initBoard }).turnCounter()[1]
                            _initBoard[ci][cj] = player
                            redrawInitBoard()
                            updateInitButtons()
                            updateActionButtons()
                        }
                    })(i, j))
            }
        }
    }
}

function updateInitButtons(){
    document.getElementById('btn-undo').disabled = _initHistory.length === 0
}

document.getElementById('btn-undo').addEventListener('click', () => {
    if(_initHistory.length === 0) return
    _initBoard = _initHistory.pop()
    redrawInitBoard()
    updateInitButtons()
    updateActionButtons()
})

document.getElementById('btn-reset').addEventListener('click', () => {
    _initBoard = getBlankBoard()
    _initHistory = []
    redrawInitBoard()
    updateInitButtons()
    updateActionButtons()
})

redrawInitBoard()

// Tree Filtering controls
document.getElementById('chk-forced').addEventListener('change', function(){
    forced = this.checked
    updateActionButtons()
})

document.getElementById('chk-symmetry').addEventListener('change', function(){
    if(!this.checked){
        const ok = confirm(
            'Warning: Disabling symmetry filtering will greatly increase the size of the tree. ' +
            'It is recommended that you only disable this feature for partial game trees with at least two moves in their initial state. ' +
            'Do you want to proceed?'
        )
        if(!ok){ this.checked = true; return }
    }
    useSymmetry = this.checked
    updateActionButtons()
})

// Minimax Settings controls
document.getElementById('chk-alphabeta').addEventListener('change', function(){
    useAlphaBeta = this.checked
    updateActionButtons()
})

document.getElementById('sel-ordering').addEventListener('change', function(){
    moveOrdering = this.value
    updateActionButtons()
})

// Committed settings — tracks what the tree was last built with (set after buildTree below)
let _committed = {}

function currentSettings(){
    return { forced, useSymmetry, moveOrdering, useAlphaBeta, startBoard: _initBoard }
}

function settingsMatch(a, b){
    return a.forced === b.forced
        && a.useSymmetry === b.useSymmetry
        && a.moveOrdering === b.moveOrdering
        && a.useAlphaBeta === b.useAlphaBeta
        && JSON.stringify(a.startBoard) === JSON.stringify(b.startBoard)
}

function defaultSettings(){
    return { forced: true, useSymmetry: true, moveOrdering: 'heuristic', useAlphaBeta: true, startBoard: _initBoardDefault() }
}

function updateActionButtons(){
    const dirty = !settingsMatch(currentSettings(), _committed)
    const atDefault = settingsMatch(currentSettings(), defaultSettings())
    document.getElementById('btn-redraw').disabled = !dirty
    document.getElementById('btn-revert').disabled = !dirty
    document.getElementById('btn-restore').disabled = atDefault
}

function applySettings(src){
    forced = src.forced
    useSymmetry = src.useSymmetry
    useAlphaBeta = src.useAlphaBeta
    moveOrdering = src.moveOrdering
    document.getElementById('chk-forced').checked = forced
    document.getElementById('chk-symmetry').checked = useSymmetry
    document.getElementById('chk-alphabeta').checked = useAlphaBeta
    document.getElementById('sel-ordering').value = moveOrdering
    _initBoard = cloneBoard(src.startBoard)
    _initHistory = []
    redrawInitBoard()
    updateInitButtons()
    updateActionButtons()
}

document.getElementById('btn-redraw').addEventListener('click', () => {
    _committed = { ...currentSettings(), startBoard: cloneBoard(_initBoard) }
    buildTree()
    updateActionButtons()
})

document.getElementById('btn-revert').addEventListener('click', () => {
    applySettings(_committed)
})

document.getElementById('btn-restore').addEventListener('click', () => {
    applySettings(defaultSettings())
})

// Action button tooltips
const _tooltip = document.getElementById('action-tooltip')
const _actionTooltips = {
    'btn-redraw':  'Redraw the tree with current settings',
    'btn-revert':  'Revert settings to last Redraw',
    'btn-restore': 'Reset all settings to defaults',
}
const _settingsTooltips = {
    'chk-forced':   'Player always plays a winning/blocking move if possible.',
    'chk-symmetry': 'Excludes rotations/mirrorings of existing successors.',
}

const _allTooltips = { ..._actionTooltips, ..._settingsTooltips }
Object.entries(_allTooltips).forEach(([id, text]) => {
    const el = document.getElementById(id)
    el.addEventListener('mouseenter', () => {
        _tooltip.textContent = text
        _tooltip.style.display = 'block'
    })
    el.addEventListener('mousemove', (e) => {
        _tooltip.style.left = (e.clientX + 12) + 'px'
        _tooltip.style.top  = (e.clientY + 12) + 'px'
    })
    el.addEventListener('mouseleave', () => {
        _tooltip.style.display = 'none'
    })
})

buildTree()
_committed = { ...currentSettings(), startBoard: cloneBoard(_initBoard) }
updateActionButtons()
