import chai, { expect } from 'chai'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'
import { BigNumber } from 'ethers'
import BalanceTree from '../src/balance-tree'

import Distributor from '../artifacts/contracts/SushiNFTDistributor.sol/SushiNFTDistributor.json'
import NFT from '../artifacts/contracts/NFT.sol/NFT.json'

chai.use(solidity)

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
type Contract = Awaited<ReturnType<typeof deployContract>>

const overrides = {
  gasLimit: 9999999,
}

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"

describe('SushiNFTDistributor', () => {
  const provider = new MockProvider({
    ganacheOptions: {
      hardfork: 'istanbul',
      mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
      gasLimit: 9999999,
    },
  })

  const wallets = provider.getWallets()
  const [wallet0, wallet1] = wallets

  let nft: Contract
  beforeEach('deploy nft', async () => {
    nft = await deployContract(wallet0, NFT, ['SushiNFT', 'NFT', 'https://sushi.com'], overrides)
  })

  describe('#nft', () => {
    it('returns the nft address', async () => {
      const distributor = await deployContract(wallet0, Distributor, [nft.address, ZERO_BYTES32], overrides)
      expect(await distributor.token()).to.eq(nft.address)
    })

    it('returns the nft name, symbol, uri', async () => {
      expect(await nft.name()).to.eq("SushiNFT")
      expect(await nft.symbol()).to.eq("NFT")
      expect(await nft.baseURI()).to.eq("https://sushi.com")
    })
  })

  describe('#claim', () => {
    it('fails for empty proof', async () => {
      const distributor = await deployContract(wallet0, Distributor, [nft.address, ZERO_BYTES32], overrides)
      await expect(distributor.claim(0, wallet0.address, 10, [])).to.be.revertedWith(
        'SushiNFTDistributor: Invalid proof.'
      )
    })

    it('fails for invalid index', async () => {
      const distributor = await deployContract(wallet0, Distributor, [nft.address, ZERO_BYTES32], overrides)
      await expect(distributor.claim(0, wallet0.address, 10, [])).to.be.revertedWith(
        'SushiNFTDistributor: Invalid proof.'
      )
    })

    describe('two account tree', () => {
      let distributor: Contract
      let tree: BalanceTree
      beforeEach('deploy', async () => {
        tree = new BalanceTree([
          { account: wallet0.address, amount: BigNumber.from(1) },
          { account: wallet1.address, amount: BigNumber.from(1) },
        ])
        distributor = await deployContract(wallet0, Distributor, [nft.address, tree.getHexRoot()], overrides)
        await nft.grantRole(MINTER_ROLE, distributor.address)
      })

      it('successful claim', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(1))
        await expect(distributor.claim(0, wallet0.address, 1, proof0, overrides))
          .to.emit(distributor, 'Claimed')
          .withArgs(wallet0.address)
        const proof1 = tree.getProof(1, wallet1.address, BigNumber.from(1))
        await expect(distributor.claim(1, wallet1.address, 1, proof1, overrides))
          .to.emit(distributor, 'Claimed')
          .withArgs(wallet1.address)
      })

      it('transfers the token', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(1))
        expect(await nft.balanceOf(wallet0.address)).to.eq(0)
        await distributor.claim(0, wallet0.address, 1, proof0, overrides)
        expect(await nft.balanceOf(wallet0.address)).to.eq(1)
      })

      it('sets #isClaimed', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(1))
        expect(await distributor.isClaimed(0)).to.eq(false)
        expect(await distributor.isClaimed(1)).to.eq(false)
        await distributor.claim(0, wallet0.address, 1, proof0, overrides)
        expect(await distributor.isClaimed(0)).to.eq(true)
        expect(await distributor.isClaimed(1)).to.eq(false)
      })

      it('cannot allow two claims', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(1))
        await distributor.claim(0, wallet0.address, 1, proof0, overrides)
        await expect(distributor.claim(0, wallet0.address, 1, proof0, overrides)).to.be.revertedWith(
          'SushiNFTDistributor: Drop already claimed.'
        )
      })

      it('cannot claim more than once: 0 and then 1', async () => {
        await distributor.claim(
          0,
          wallet0.address,
          1,
          tree.getProof(0, wallet0.address, BigNumber.from(1)),
          overrides
        )
        await distributor.claim(
          1,
          wallet1.address,
          1,
          tree.getProof(1, wallet1.address, BigNumber.from(1)),
          overrides
        )

        await expect(
          distributor.claim(0, wallet0.address, 1, tree.getProof(0, wallet0.address, BigNumber.from(1)), overrides)
        ).to.be.revertedWith('SushiNFTDistributor: Drop already claimed.')
      })

      it('cannot claim more than once: 1 and then 0', async () => {
        await distributor.claim(
          1,
          wallet1.address,
          1,
          tree.getProof(1, wallet1.address, BigNumber.from(1)),
          overrides
        )
        await distributor.claim(
          0,
          wallet0.address,
          1,
          tree.getProof(0, wallet0.address, BigNumber.from(1)),
          overrides
        )

        await expect(
          distributor.claim(1, wallet1.address, 1, tree.getProof(1, wallet1.address, BigNumber.from(1)), overrides)
        ).to.be.revertedWith('SushiNFTDistributor: Drop already claimed.')
      })

      it('cannot claim for address other than proof', async () => {
        const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(1))
        await expect(distributor.claim(1, wallet1.address, 1, proof0, overrides)).to.be.revertedWith(
          'SushiNFTDistributor: Invalid proof.'
        )
      })
    })
  })
})
