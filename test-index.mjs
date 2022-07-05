import { loadStdlib } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
import { ask } from '@reach-sh/stdlib';
console.log(process.argv);
if (
	// if no role or role doesnt match buyer or seller exit
	process.argv.length < 3 ||
	['seller', 'buyer'].includes(process.argv[2]) == false
) {
	console.log('Usage: reach run index [seller|buyer]');
	process.exit(0);
}
// pulling which user from the command line
const role = process.argv[2];

console.log(`Your role is ${role}`);

const stdlib = loadStdlib(process.env);

console.log(`The consensus network is ${stdlib.connector}.`);
// Pulling stardard unit from librabry in this case algo
const suStr = stdlib.standardUnit;
// to atomic units
const toAU = (su) => stdlib.parseCurrency(su);
// to standard units
const toSU = (au) => stdlib.formatCurrency(au, 4);
const iBalance = toAU(1000);

const showBalance = async (acc) =>
	// changing balance to Algo from uAlgo
	console.log(`Your balance is ${toSU(await stdlib.balanceOf(acc))} ${suStr}.`);

const commonInteract = (role) => ({
	// creating the commonInteract for shared properties between users
	reportTransfer: (payment) => {
		console.log(
			`The contract paid ${toSU(payment)} ${suStr} to ${
				role == 'seller' ? 'you' : 'the seller'
			}.`
		);
	},
	reportPayment: (payment) => {
		// reporting back to the buyer and seller the buyer has paid amount to the contract
		console.log(
			`${role == 'buyer' ? 'You' : 'The buyer'} paid ${toSU(
				payment
			)} ${suStr} to the contract.`
		);
	},
	reportCancellation: () => {
		console.log(
			`${role == 'buyer' ? 'You' : 'The buyer'} cancelled the order.`
		);
	},
});

// Seller
if (role === 'seller') {
	const sellerInteract = {
		...commonInteract(role),
		price: toAU(5),
		wisdom: await ask.ask(
			'Enter a wise phrase, or press Enter for default:',
			(s) => {
				let w = !s ? 'Build healthy communities.' : s;
				if (!s) {
					console.log(w);
				}
				return w;
			}
		),
		// called after entering consensus step and displays the price wisdom is for sale to the console and contract info used to attach
		reportReady: async (price) => {
			console.log(`Your wisdom is for sale at ${toSU(price)} ${suStr}.`);
			console.log(`Contract info: ${JSON.stringify(await ctc.getInfo())}`);
		},
	};

	const acc = await stdlib.newTestAccount(iBalance);
	// show Balance defined {line 21}
	await showBalance(acc);
	const ctc = acc.contract(backend);
	await ctc.p.Seller(sellerInteract);
	await showBalance(acc);

	// Buyer
} else {
	const buyerInteract = {
		...commonInteract(role),
		confirmPurchase: async (price) =>
			// asking user if they would like to purchase wisdom for standard unit price
			// returns bool
			await ask.ask(
				`Do you want to purchase wisdom for ${toSU(price)} ${suStr}?`,
				ask.yesno
			),
		reportWisdom: (wisdom) => console.log(`Your new wisdom is "${wisdom}"`),
	};

	const acc = await stdlib.newTestAccount(iBalance);
	const info = await ask.ask('Paste contract info:', (s) => JSON.parse(s));
	const ctc = acc.contract(backend, info);
	await showBalance(acc);
	await ctc.p.Buyer(buyerInteract);
	await showBalance(acc);
}

ask.done();
