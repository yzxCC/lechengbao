function findWord (str, wordSet) {
	var strArr = []
	var idx = 0
	var flag = true
	while (idx < str.length && flag) {
		for (var i = 0; i < wordSet.length; i++) {
			var word = wordSet[i]
			var substr = str.substr(idx, word.length)
			if (word == substr) {
				flag = true
				var end = idx + word.length
				strArr.push(substr)
				idx = end
				break
			} else {
				flag = false
			}
		}
	}


	if (!flag) {
		return false
	}

	return strArr.join(' ')
}

// s = 'castlejoycastlecatjoy'
// wordSet = ['joy', 'castle', 'cat']
// console.log(findWord(s, wordSet))

// 2

function Rect (x, y, width, height) {
	// 中心点
	this.x = x
	this.y = y

	// 宽高
	this.width = width
	this.height = height
}

Rect.prototype.intersect = function (rect) {
	if ((Math.abs(this.x - rect.x) < (this.width + rect.width) / 2) && (Math.abs(this.y - rect.y) < (this.height + rect.height) / 2)) {
		return true
	}
	return false
}

rectArr = []

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

getRandomInt(1, 6)

for (var i = 0; i < 10; i++) {
	var rect = new Rect(getRandomInt(1, 20), getRandomInt(1, 20), getRandomInt(5, 10), getRandomInt(5, 10))
	rectArr.push(rect)
	console.log(rect.x, rect.y, rect.width, rect.height)
}

var count = 0
for (var i = 0; i < rectArr.length - 1; i++) {
	var rect1 = rectArr[i]
	for (var j = i+1; j < rectArr.length; j++) {
		if (rect1.intersect(rectArr[j])) {
			count = count + 1
		}
	};
};

console.log(count)

3.记录重叠次数最多的10个矩形 ，接以上算法首先添加前面10个矩形的重叠次数，
之后把数组中最小的的那个数给替换掉，这10个矩形对应的是第i矩形