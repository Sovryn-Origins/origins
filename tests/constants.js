// Constants

const {
	BN, // Big Number support.
	constants,
} = require("@openzeppelin/test-helpers");

let zero = new BN(0);
let zeroAddress = constants.ZERO_ADDRESS;
let dummyAddress = "0x0000000000000000000000000000000000000001";

const fourWeeks = 4 * 7 * 24 * 60 * 60;

const zeroBasisPoint = 0;
const twentyBasisPoint = 2000;
const fiftyBasisPoint = 5000;
const hundredBasisPoint = 10000;
const invalidBasisPoint = 10001;

const depositTypeRBTC = 0;
const depositTypeToken = 1;

const unlockTypeNone = 0;
const unlockTypeImmediate = 1;
const unlockTypeWaited = 2;

const saleEndDurationOrTSNone = 0;
const saleEndDurationOrTSUntilSupply = 1;
const saleEndDurationOrTSDuration = 2;
const saleEndDurationOrTSTimestamp = 3;

const verificationTypeNone = 0;
const verificationTypeEveryone = 1;
const verificationTypeByAddress = 2;
const verificationTypeByStake = 3;

const transferTypeNone = 0;
const transferTypeUnlocked = 1;
const transferTypeWaitedUnlock = 2;
const transferTypeVested = 3;
const transferTypeLocked = 4;
const transferTypeNWaitedUnlock = 5;
const transferTypeNVested = 6;
const transferTypeNLocked = 7;

const saleTypeNone = 0;
const saleTypeFCFS = 1;
const saleTypePooled = 2;

const sendTokens = true;
const dontSendTokens = false;

const receiveTokens = true;
const dontReceiveTokens = false;

module.exports = {
	zero,
	zeroAddress,
	dummyAddress,
	fourWeeks,

	zeroBasisPoint,
	twentyBasisPoint,
	fiftyBasisPoint,
	hundredBasisPoint,
	invalidBasisPoint,

	depositTypeRBTC,
	depositTypeToken,

	unlockTypeNone,
	unlockTypeImmediate,
	unlockTypeWaited,

	saleEndDurationOrTSNone,
	saleEndDurationOrTSUntilSupply,
	saleEndDurationOrTSDuration,
	saleEndDurationOrTSTimestamp,

	verificationTypeNone,
	verificationTypeEveryone,
	verificationTypeByAddress,
	verificationTypeByStake,

	transferTypeNone,
	transferTypeUnlocked,
	transferTypeWaitedUnlock,
	transferTypeVested,
	transferTypeLocked,
	transferTypeNWaitedUnlock,
	transferTypeNVested,
	transferTypeNLocked,

	saleTypeNone,
	saleTypeFCFS,
	saleTypePooled,

	sendTokens,
	dontSendTokens,

	receiveTokens,
	dontReceiveTokens,
};
