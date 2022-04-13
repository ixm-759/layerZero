const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("OFT: ", function () {
    beforeEach(async function () {
        this.accounts = await ethers.getSigners()
        this.owner = this.accounts[0]

        const LZEndpointMock = await ethers.getContractFactory("LZEndpointMock")
        const BasedOFT = await ethers.getContractFactory("BasedOFT")
        const OmnichainFungibleToken = await ethers.getContractFactory("OFT")

        this.chainIdSrc = 1
        this.chainIdDst = 2

        this.lzEndpointSrcMock = await LZEndpointMock.deploy(this.chainIdSrc)
        this.lzEndpointDstMock = await LZEndpointMock.deploy(this.chainIdDst)

        this.initialSupplyOnEndpoint = ethers.utils.parseUnits("1000000", 18)

        // create two OmnichainFungibleToken instances
        this.OmnichainFungibleTokenSrc = await BasedOFT.deploy("NAME1", "SYM1", this.lzEndpointSrcMock.address, this.initialSupplyOnEndpoint)

        this.OmnichainFungibleTokenDst = await OmnichainFungibleToken.deploy("NAME1", "SYM1", this.lzEndpointDstMock.address, 0)

        this.lzEndpointSrcMock.setDestLzEndpoint(this.OmnichainFungibleTokenDst.address, this.lzEndpointDstMock.address)
        this.lzEndpointDstMock.setDestLzEndpoint(this.OmnichainFungibleTokenSrc.address, this.lzEndpointSrcMock.address)

        // set each contracts source address so it can send to each other
        await this.OmnichainFungibleTokenSrc.setTrustedRemote(this.chainIdDst, this.OmnichainFungibleTokenDst.address) // for A, set B
        await this.OmnichainFungibleTokenDst.setTrustedRemote(this.chainIdSrc, this.OmnichainFungibleTokenSrc.address) // for B, set A

        // retrieve the starting tokens
        this.startingTokens = await this.OmnichainFungibleTokenSrc.balanceOf(this.owner.address)
    })

    it("burn local tokens on source chain and mint on destination chain", async function () {
        // ensure they're both starting from 1000000
        let a = await this.OmnichainFungibleTokenSrc.balanceOf(this.owner.address)
        let b = await this.OmnichainFungibleTokenDst.balanceOf(this.owner.address)
        expect(a).to.be.equal(this.startingTokens)
        expect(b).to.be.equal("0x0")

        // v1 adapterParams, encoded for version 1 style, and 200k gas quote
        let adapterParam = ethers.utils.solidityPack(["uint16", "uint256"], [1, 225000])

        // approve and send tokens
        let sendQty = ethers.utils.parseUnits("100", 18)
        await this.OmnichainFungibleTokenSrc.approve(this.OmnichainFungibleTokenSrc.address, sendQty)
        await this.OmnichainFungibleTokenSrc.send(
            this.chainIdDst,
            ethers.utils.solidityPack(["address"], [this.owner.address]),
            sendQty,
            this.owner.address,
            ethers.constants.AddressZero,
            adapterParam
        )

        // verify tokens burned on source chain and minted on destination chain
        a = await this.OmnichainFungibleTokenSrc.balanceOf(this.owner.address)
        b = await this.OmnichainFungibleTokenDst.balanceOf(this.owner.address)
        expect(a).to.be.equal(this.startingTokens.sub(sendQty))
        expect(b).to.be.equal(sendQty)
    })
})
