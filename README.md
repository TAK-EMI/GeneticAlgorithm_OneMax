TypeScriptと遺伝的アルゴリズムの勉強のために、 [こちらページ](https://qiita.com/Azunyan1111/items/975c67129d99de33dc21) のプログラムをTypeScriptに書き換えてみます。
PythonにはあるけどTypescriptにはない関数なんかもあるので、そういう関数も他のサイトを参考にしつつ実装して進めます。

遺伝的アルゴリズムの解説は、参考ページや、そこにリンクのあるスライドがとても詳しいので、そちらを参照してください。
ソースコードは[こちら](https://github.com/TAK-EMI/GeneticAlgorithm_OneMax)で公開しています。

## 追加した算術関数
ここは本質ではないので、参考サイトのコピペで済ましています。

### Sum
配列の合計を求める関数
[参考サイト](https://qiita.com/phi/items/3b10288b02c87057c006)

```typescript
// 合計の算出
function sum(arr: Array<number>): number {
	return arr.reduce(function(prev, current, i, arr) {
		return prev + current;
	});
}
```

### Range
連番の配列を返す関数
[参考サイト](https://qiita.com/kmdsbng/items/f43dce6794f660e382da)

```typescript
// 連番の生成関数
function range(start: number, stop: number, step: number = 1): Array<number> {
	return Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);
}
```

## その他、追加した関数
算術関数以外に、個人的に関数にした方がよいと思ったものを関数化しています。

### 遺伝子ランダム生成
関数化するほどでもない処理ですが、こういう役割を持った処理は関数化する方が個人的には好みです。

```typescript
/**
 * 遺伝子ランダム生成
 * @returns 0か1を返す
 */
function createRandomGene(): number {
	const GENE_MAX: number = 2;
	return Math.floor(Math.random() * GENE_MAX);
}
```

### 個体配列のコピー関数
後述する`Genom`クラスの配列をDeep Copyします。
この関数を利用する箇所が適切かどうかは、なんとも不安があります。

```typescript
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
```

### 個体のソート関数
この処理も単独で役割を持っているので、関数化します。

```typescript
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
```

## PythonをTypeScriptに書き換える

参考ページのPythonをTypeScriptに書き換えていきます。
まずは、遺伝的アルゴリズムにおける個体を表すGenomクラスから。

### Genom.ts
上記のDeep Copyを実現するために、`copy()`というクラス関数を、デバッグ用に`toString()`を追加しています。

```typescript:Genom.ts
/**
 * 個体クラス
 * 遺伝子配列と適応度を持つ
 */
export class Genom {
	public static copy(value: Genom): Genom {
		return new Genom(value.Genom, value.Evalution);
	}

	private _genomList: Array<number>; // 遺伝子配列
	private _evalution: number; // 適応度

	constructor(list: Array<number>, evalution: number) {
		this._genomList = list;
		this._evalution = evalution;
	}

	public get Genom(): Array<number> {
		return this._genomList;
	}
	public get Evalution(): number {
		return this._evalution;
	}
	public set Genom(value) {
		this._genomList = value;
	}
	public set Evalution(value) {
		this._evalution = value;
	}

	public toString() {
		return `{ Evalution: ${this._evalution}, Genom: [ ${this._genomList
			.map((v: number, i: number) => {
				return String(v);
			})
			.join(',')}] }\n`;
	}
}
```

### main.ts

エントリーポイントとなるファイルです。
参考サイトを基に実装していきます。

`Genom`クラスを`import`しておきます。

```typescript:main.ts
import { Genom } from './Genom';
```

#### 定数

ほとんど変更ありません。

```typescript:main.ts
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
```

#### 個体生成
`i`など、余計な変数を作らないように`forEach`を使ってますが、正しい使い方かどうかはよくわかってません。

```typescript:main.ts
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
```

#### 評価

ここで`Sum`関数を使います。

```typescript:main.ts
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
```

#### 選択

`sortEvalution()`でソートを行い、`Array.slice()`で上位の要素を抽出しています。

```typescript:main.ts
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
```

#### 交叉

`Array.slice()`と`Array.concat()`を利用して交叉を行います。
交叉点を求める部分を関数化してもよかったかもしれないですね。

```typescript:main.ts
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
```

#### 次世代生成

行っていることは上の関数等とほとんど変わりありません。
現行世代のうち、評価の低い個体を破棄し、代わりにエリートと子孫を配列に連結させています。

```typescript:main.ts
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
```

#### 突然変異

個体と遺伝子はそれぞれ確立にしたがって突然変異します。

```typescript:main.ts
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
```

#### main関数

Pythonの`__main__`をmain関数として実装します。

```typescript:main.ts
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
```
最後に`main`関数を呼び出して完了です。

```typescript:main.ts
// メイン関数を実行する。
main();
```


## 実行結果

実行結果です。
200世代くらい継続すると`Max=100`になりました。

```console
-----第1世代の結果-----
    Min: 0.41
    Max: 0.60
    Avg: 0.495
-----第2世代の結果-----
    Min: 0.44
    Max: 0.67
    Avg: 0.546
-----第3世代の結果-----
    Min: 0.50
    Max: 0.66
    Avg: 0.582
-----第4世代の結果-----

        :

-----第39世代の結果-----
    Min: 0.87
    Max: 0.95
    Avg: 0.927
-----第40世代の結果-----
    Min: 0.82
    Max: 0.96
    Avg: 0.932
最も優れた個体は[ 1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1 ]
```

### 実行方法

参考のページに習って実行方法も載せておきます。

```console
$ git clone https://github.com/TAK-EMI/GeneticAlgorithm_OneMax.git

$ cd GeneticAlgorithm_OneMax/

$ npm install

$ npm run build-run
```

## 感想

楽しい！！
✌('ω'✌ )三✌('ω')✌三( ✌'ω')✌

ただ写経するだけでも楽しいけど、別の言語に読み替えたりすると色々学びがあってなお楽しいです。

Qiitaの記事は[こちら](https://qiita.com/TAK_EMI/items/a368a9d2113f30afebe9)。
