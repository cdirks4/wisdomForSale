'reach 0.1';
const commonInteract = {
	reportCancellation: Fun([], Null),
	reportTransfer: Fun([UInt], Null),
	reportPayment: Fun([UInt], Null),
};
const sellerInteract = {
	...commonInteract,
	price: UInt,
	wisdom: Bytes(128),
	reportReady: Fun([UInt], Null),
};
const buyerInteract = {
	...commonInteract,
	confirmPurchase: Fun([UInt], Bool),
	reportWisdom: Fun([Bytes(128)], Null),
};
export const main = Reach.App(() => {
	// when ctc.p.Seller {index.mjs line 72}
	const S = Participant('Seller', sellerInteract);
	// when ctc.p.Buyer {index.mjs line 92}
	const B = Participant('Buyer', buyerInteract);

	init();
	// enter step
	S.only(() => {
		// seller decides the price they would like to sell their wisdom at
		const price = declassify(interact.price);
	});
	// publish to consensus step
	S.publish(price);
	// consensus step is used for actions that do not require a user
	// { index.mjs line 71}
	S.interact.reportReady(price);
	// once action is completed commit is used to exit the consensus step
	commit();
	B.only(() => {
		// {index.mjs line 92 returns Bool}
		const willBuy = declassify(interact.confirmPurchase(price));
	});
	B.publish(willBuy);
	if (!willBuy) {
		commit();
		each([S, B], () => interact.reportCancellation());
		exit();
	} else {
		commit();
	}
	B.pay(price);
	each([S, B], () => interact.reportPayment(price));
	commit();
	S.only(() => {
		const wisdom = declassify(interact.wisdom);
	});
	S.publish(wisdom);
	transfer(price).to(S);
	commit();
	each([S, B], () => interact.reportTransfer(price));
	B.interact.reportWisdom(wisdom);
	exit();
});
