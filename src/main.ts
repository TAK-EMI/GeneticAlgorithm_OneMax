import { Genom } from './Genom';

// 遺伝子情報の長さ
const GENOM_LENGTH: number = 100;
// 遺伝子集団の大きさ
const MAX_GENOM_LIST: number = 100;
// 遺伝子選択数
const SELECT_GENOM: number = 20;
// 個体突然変異確立
const INDIVIDUAL_MUTATION: number = 0.1;
// 遺伝子突然変異確立
const GENOM_MUTATION: number = 0.1;
// 繰り返す世代数
const MAX_GENERATION: number = 40;

// 連番の生成関数 (Clojure や PHP などでよく "range" と呼ばれる)
function range(start: number, stop: number, step: number = 1): Array<number> {
	return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
}
// 合計の算出
function sum(arr: Array<number>): number {
	return arr.reduce(function(prev, current, i, arr) {
		return prev + current;
	});
}

/**
 * GenomClassの配列をDeepCopyする。
 * @param list コピーしたい配列
 */
function copyGenomList(list: Array<Genom>): Array<Genom> {
	const ret = new Array<Genom>();

	for (const g of list) {
		ret.push(Genom.copy(g));
	}

	return ret;
}

/**
 * 遺伝子ランダム生成
 * @returns 0か1を返す
 */
function createRandomGene(): number {
	const GENE_MAX: number = 2;
	return Math.floor(Math.random() * GENE_MAX);
}

/**
 * GenomClassをEvalutionの高い順でソートする。
 * @param list 並べ替えるGenomClass
 * @returns 並べ替えたGenomClass
 */
function sortEvalution(list: Array<Genom>): Array<Genom> {
	const sortResult = copyGenomList(list);
	sortResult.sort((a: Genom, b: Genom) => {
		if (a.Evalution === b.Evalution) {
			return 0;
		} else if (a.Evalution > b.Evalution) {
			return -1;
		} else {
			return 1;
		}
	});

	return sortResult;
}

/**
 * 引数で指定された桁のランダムな遺伝子情報を生成、格納したGenomClassで返します。
 * @param length 遺伝子情報の長さ
 * @returns 生成した個体集団GenomClass
 */
function createGenom(length: number): Genom {
	const list = new Array<number>();
	range(1, length).forEach(() => {
		list.push(createRandomGene());
	});
	return new Genom(list, 0);
}

/**
 * 評価関数
 * 今回はすべての遺伝子が1となれば最適解となるので、
 * 合計して遺伝子と同じ長さの数となった場合を1として0.00～1.00で評価します。
 * @param ga 評価を行うgenomGlass
 * @returns gaの適応度を返す
 */
function evaluation(ga: Genom): number {
	const genom = ga.Genom;
	return sum(genom) / genom.length;
}

/**
 * 選択関数
 * エリート選択を行います。
 * 評価が高い順番にソートを行った後、一定以上のGenomClassのみを返却する。
 * @param gaList 選択を行うGenomClassの配列
 * @param eliteLength 選択するエリートの数
 * @returns 選択処理をした一定のエリート、GenomClassを返す
 */
function select(gaList: Array<Genom>, eliteLength: number): Array<Genom> {
	// 現行世代個体集団の評価を高い順番にソートする
	const sortResult = sortEvalution(gaList);
	// 一定の上位を抽出する
	return sortResult.slice(0, eliteLength);
}

/**
 * 交叉関数
 * 二点交叉を行います。
 * 交叉させるGenomClassの配列を引数に持つ
 * @param ga01 ひとつ目の個体
 * @param ga02 ふたつ目の個体
 * @returns ふたつの子孫GenomClassを格納したリストを返す
 */
function crossOver(ga01: Genom, ga02: Genom): Array<Genom> {
	// 子孫を格納するリストを生成する
	const list = new Array<Genom>();
	// 入れ替える2点の点を設定する。
	const cross01 = Math.floor(Math.random() * GENOM_LENGTH);
	const cross02 = Math.floor(cross01 + Math.random() * (GENOM_LENGTH - cross01));

	// 遺伝子を取り出します
	const one = ga01.Genom;
	const second = ga02.Genom;

	// 交叉する
	const progeny01 = one.slice(0, cross01).concat(second.slice(cross01, cross02), one.slice(cross02, GENOM_LENGTH));
	const progeny02 = second.slice(0, cross01).concat(one.slice(cross01, cross02), second.slice(cross02, GENOM_LENGTH));

	// GenomClassインスタンスを生成して子孫をリストに格納する
	list.push(new Genom(progeny01, 0));
	list.push(new Genom(progeny02, 0));

	return list;
}

/**
 * 世代交代処理
 * @param ga 現行世代個体集団
 * @param gaElite 現行世代エリート集団
 * @param gaProgeny 現行世代子孫集団
 * @returns 次世代個体集団
 */
function nextGenerationGeneCreate(ga: Array<Genom>, gaElite: Array<Genom>, gaProgeny: Array<Genom>): Array<Genom> {
	// 現行世代個体集団の評価を低い順番にソートする
	let nextGenerationGeno = sortEvalution(ga);

	// 追加するエリート集団と子孫集団の合計ぶんを取り除く
	// エリート集団と子孫集団を次世代集団を次世代へ追加します
	nextGenerationGeno = nextGenerationGeno.slice(0, nextGenerationGeno.length - (gaElite.length + gaProgeny.length)).concat(gaElite, gaProgeny);

	return nextGenerationGeno;
}

/**
 * 突然変異関数
 * @param gaList 突然変異させるGenomClass
 * @param individualMutation 個体に対する突然変異確立
 * @param genomMutation 遺伝子ひとつひとつに対する突然変異確立
 * @returns 突然変異処理をしたGenomClass
 */
function mutation(gaList: Array<Genom>, individualMutation: number, genomMutation: number): Array<Genom> {
	const list = copyGenomList(gaList);
	for (const ga of list) {
		// 個体に対して一定の確率で突然変異が起きる
		if (individualMutation > Math.random()) {
			const genomList = new Array<number>();
			for (const gene of ga.Genom) {
				// 個体の遺伝子情報ひとつひとつに対して突然変異がおこる
				if (genomMutation > Math.random()) {
					genomList.push(createRandomGene());
				} else {
					genomList.push(gene);
				}
			}
			ga.Genom = genomList;
		}
	}

	return list;
}

/**
 * メイン関数
 */
function main() {
	// 一番最初の現行世代個体集団を生成する
	let currentGenerationIndividualGroup = new Array<Genom>();

	range(1, MAX_GENOM_LIST).forEach(() => {
		currentGenerationIndividualGroup.push(createGenom(GENOM_LENGTH));
	});

	let eliteGenes = new Array<Genom>();
	for (const count of range(1, MAX_GENERATION)) {
		// 現行世代個体集団の遺伝子を評価し、GenomClassに代入する。
		for (const genom of currentGenerationIndividualGroup) {
			genom.Evalution = evaluation(genom);
		}

		// エリート個体を選択
		eliteGenes = select(currentGenerationIndividualGroup, SELECT_GENOM);

		// エリート遺伝子を交叉させ、リストに格納する
		let progenyGene = new Array<Genom>();
		for (const idx of range(1, SELECT_GENOM - 1)) {
			progenyGene = progenyGene.concat(crossOver(eliteGenes[idx - 1], eliteGenes[idx]));
		}

		// 次世代個体集団を現行世代、エリート集団、子孫集団から作成する
		let nextGenerationIndividualGroup = nextGenerationGeneCreate(currentGenerationIndividualGroup, eliteGenes, progenyGene);

		// 次世代個体集団全ての個体に突然変異を施す。
		nextGenerationIndividualGroup = mutation(nextGenerationIndividualGroup, INDIVIDUAL_MUTATION, GENOM_MUTATION);

		// 1世代の進化的計算終了。評価に移る。

		// 各個体適用度を配列化する。
		const fits: Array<number> = currentGenerationIndividualGroup.map((value: Genom) => {
			return value.Evalution;
		});

		// 進化結果を評価する。
		const min = Math.min(...fits);
		const max = Math.max(...fits);
		const avg = sum(fits) / fits.length;

		console.log(`-----第${count}世代の結果-----`);
		console.log(`    Min: ${min.toFixed(2)}`);
		console.log(`    Max: ${max.toFixed(2)}`);
		console.log(`    Avg: ${avg.toFixed(3)}`);

		// 現行世代と次世代を入れ替える。
		currentGenerationIndividualGroup = copyGenomList(nextGenerationIndividualGroup);
	}

	// 最終結果出力
	console.log(`最も優れた個体は[ ${String(eliteGenes[0].Genom)} ]`);
}

// メイン関数を実行する。
main();
