// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.6.11;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Metadata.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFT is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor(string memory name_, string memory symbol_, string memory baseURI_) public ERC721(name_, symbol_) {
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setBaseURI(baseURI_);
    }

    function setBaseURI(string memory baseURI_) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Token: account does not have admin role");

        _setBaseURI(baseURI_);
    }

    function mint(address to) external {
        require(hasRole(MINTER_ROLE, msg.sender), "Token: account does not have minter role");

        _tokenIds.increment();

        uint256 newTokenId = _tokenIds.current();
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, Strings.toString(newTokenId));
    }
}