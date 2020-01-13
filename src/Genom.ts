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
			.map((v: number) => {
				return String(v);
			})
			.join(',')}] }\n`;
	}
}
