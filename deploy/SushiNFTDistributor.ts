import { ethers } from 'hardhat'

const nft_name = "SushiNFT";
const nft_symbol = "NFT";
const ntf_uri = "https://sushi.com"

const merkle_root = "0x4da08d34dc55f0ed2c13f2aa136a2b87871e64c5fb1bd0e9d233c2807034132b"

const minter_role = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"

export default async () => {
    const NFTFactory = await ethers.getContractFactory("NFT");
    const DistributorFactory = await ethers.getContractFactory("SushiNFTDistributor");

    const NFT = await NFTFactory.deploy(
        nft_name,
        nft_symbol,
        ntf_uri
    )

    const Distributor = await DistributorFactory.deploy(
        NFT.address,
        merkle_root
    )

    await NFT.grantRole(minter_role, Distributor.address)

    console.log(Distributor.address)
}