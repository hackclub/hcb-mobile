interface Description {
  desc: string;
  monthly?: boolean;
}

interface Transaction {
  desc: string;
  amount: number;
  date: string;
  monthly?: boolean;
}

interface FormattedTransaction {
  amount: {
    value: string;
    cents: number;
  };
  feePayment: boolean;
  date: string;
  localHcbCode: {
    memo: string;
    receipts: Array<Record<string, never>>;
    comments: Array<Record<string, never>>;
    isDonation: boolean;
    donation: { isRecurring: boolean } | null;
    tags: string[];
  };
}

class MockTransactionEngine {
  static NEGATIVE_DESCRIPTIONS: Description[] = [
    { desc: "🌶️ Jalapeños for the steamy social salsa sesh" },
    { desc: "👩‍💻 Payment for club coding lessons (solid gold; rare; imported)" },
    { desc: "🍺 Reimbursement for Friday night's team-building pub crawl" },
    { desc: "😨 Monthly payment to the local protection racket" },
    { desc: "🚀 Rocket fuel for Lucas' commute" },
    { desc: "🎵 Payment for a DJ for the club disco (groovy)" },
    { desc: "🤫 Hush money" },
    { desc: "🦄 Purchase of a cute unicorn for team morale" },
    { desc: "🍌 Bananas (Fairtrade)" },
    { desc: "💸 Withdrawal for emergency pizza run" },
    { desc: "🍔 Withdrawal for a not-so-emergency burger run" },
    { desc: "🧑‍🚀 Astronaut suit for Lucas to get home when it's cold" },
    { desc: "🫘 Chilli con carne (home cooked, just how you like it)" },
    { desc: "🦖 Purchase of a teeny tiny T-Rex" },
    { desc: "🧪 Purchase of lab rats for the club's genetics project" },
    { desc: "🐣 An incubator to help hatch big ideas" },
    { desc: "📈 Financial advisor to teach us better spending tips" },
    { desc: "🐛 Office wormery" },
    { desc: "📹 Webcams for the team x4" },
    { desc: "🪨 Hackathon rock tumbler" },
    { desc: "🌸 Payment for a floral arrangement" },
    { desc: "🧼 Purchase of eco-friendly soap for the club bathrooms" },
  ];

  static POSITIVE_DESCRIPTIONS: Description[] = [
    { desc: "💰 Donation from t̶͖̯́̒̇͝h̸͇̥̘̖̞̋͛̕ę̷̧̯̓̄͜ ̵̧̡̀̎͋̚v̸̰̰̝͈̟̂̇̏̓ͅo̶͓͈͑̑̄̍i̸͉̺͕̥̓̍d̵̟̮̼̠̺̿͌́" },
    { desc: "💰 Donation from the man in the walls", monthly: true },
    { desc: "💰 Donation from Dave from next door", monthly: true },
    { desc: "💰 Donation from Old Greg down hill" },
  ];

  private mockTxNum: number;
  private mockBalance: number;

  constructor() {
    this.mockTxNum = Math.floor(Math.random() * (10 - 7 + 1)) + 7;
    this.mockBalance = 0;
  }

  generateMockTx(): Transaction {
    const descIndex = Math.floor(
      Math.random() * MockTransactionEngine.NEGATIVE_DESCRIPTIONS.length,
    );
    const amount = -Math.random() * this.mockBalance;
    return {
      ...MockTransactionEngine.NEGATIVE_DESCRIPTIONS[descIndex],
      amount: amount,
      date: "",
    };
  }

  generateMockDonation(): Transaction {
    const descIndex = Math.floor(
      Math.random() * MockTransactionEngine.POSITIVE_DESCRIPTIONS.length,
    );
    const amount = Math.random() * 1000;
    return {
      ...MockTransactionEngine.POSITIVE_DESCRIPTIONS[descIndex],
      amount: amount,
      date: "",
    };
  }

  generateMockFiscalSponsorshipFee(donationAmount: number): Transaction {
    return {
      desc: "💰 Fiscal sponsorship fee",
      amount: -0.07 * donationAmount,
      date: "",
    };
  }

  generateMockTransactionList(): FormattedTransaction[] {
    const mockTx: Transaction[] = [];
    let index = 0;

    while (index < this.mockTxNum) {
      if (this.mockBalance > Math.floor(Math.random() * 40) + 1) {
        const tx = this.generateMockTx();
        mockTx.push(tx);
        this.mockBalance += tx.amount;
        index++;
      } else {
        const donation = this.generateMockDonation();
        mockTx.push(donation);
        this.mockBalance += donation.amount;

        const fee = this.generateMockFiscalSponsorshipFee(donation.amount);
        mockTx.push(fee);
        this.mockBalance += fee.amount;

        index += 2;
      }
    }

    const currentDate = new Date();

    mockTx.reverse().forEach((tx) => {
      const randomInterval = tx.desc.includes("💰 Fiscal sponsorship fee")
        ? 7
        : Math.floor(Math.random() * (180 - 8 + 1)) + 8;
      tx.date = currentDate.toISOString().split("T")[0];
      currentDate.setDate(currentDate.getDate() - randomInterval);
    });

    return mockTx.reverse().map((tx) => {
      return {
        amount: {
          value: tx.amount.toFixed(2),
          cents: Math.round(tx.amount * 100),
        },
        feePayment: tx.desc.includes("💰 Fiscal sponsorship fee"),
        date: tx.date,
        localHcbCode: {
          memo: tx.desc,
          receipts: this.generateReceipts(tx),
          comments: this.generateComments(tx),
          isDonation: tx.amount > 0,
          donation:
            tx.amount > 0
              ? {
                  isRecurring: !!tx.monthly,
                }
              : null,
          tags: [],
        },
      };
    });
  }

  generateReceipts(tx: Transaction): Array<Record<string, never>> {
    if (tx.amount < 0 && !tx.desc.includes("💰 Fiscal sponsorship fee")) {
      return Math.random() < 0.9 ? [{}] : [];
    }
    return [];
  }

  generateComments(tx: Transaction): Array<Record<string, never>> {
    if (
      !tx.desc.includes("💰 Fiscal sponsorship fee") &&
      Math.random() > 1 / 3
    ) {
      const numComments = Math.floor(Math.random() * 2) + 1;
      return Array(numComments).fill({});
    }
    return [];
  }

  run(): FormattedTransaction[] {
    return this.generateMockTransactionList();
  }
}

export default MockTransactionEngine;
