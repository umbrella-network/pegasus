import { ethers } from 'ethers';

const hash = ethers.utils.solidityKeccak256;
const lastHash = '0x' + 'f'.repeat(64);
const emptyRoot = '0x' + '0'.repeat(64);
const isOdd = n => n % 2 !== 0;

class SortedMerkleTree {
  /**
   * @param keyValuePairs {Object} pairs of: string => buffer
   */
  constructor(keyValuePairs) {
    this.keys = {};
    this.tree = [];
    this.data = keyValuePairs;

    if (Object.keys(this.data).length > 0) {
      this.createTree(this.addEvenHash(this.createLeaves(this.data)));
    }
  }

  hashIt(h1, h2) {
    const sorted = [h1, h2].sort();
    return hash(['bytes32', 'bytes32'], [sorted[0], sorted[1]]);
  }

  leafHash(k, v) {
    return hash(['bytes', 'bytes'], [k, v]);
  }

  createLeafHash(k) {
    return this.leafHash(Buffer.from(k), this.data[k]);
  }

  addEvenHash(hashes) {
    if (hashes.length > 1 && isOdd(hashes.length)) {
      hashes.push(lastHash);
    }

    return hashes;
  }

  createLeaves(keyValuePairs) {
    return Object.keys(keyValuePairs).map((k, i) => {
      const leafId = this.createLeafHash(k);
      this.keys[k] = i;
      return leafId;
    })
  }

  createNextTreeLevel(inputs) {
    const hashes = [];

    for (let i = 0; i + 1 < inputs.length; i += 2) {
      hashes.push(this.hashIt(inputs[i], inputs[i + 1]));
    }

    return hashes;
  }

  createTree(inputs) {
    this.tree.push(inputs);

    if (inputs.length > 1) {
      const nextLevelInputs = this.createNextTreeLevel(inputs);
      this.createTree(this.addEvenHash(nextLevelInputs));
    }
  }

  getLeaves() {
    return this.tree.length > 0 ? this.tree[0] : [];
  }

  getIndexForKey(key) {
    return this.keys[key];
  }

  generateProof(level, idx, proof = []) {
    if (level === this.tree.length - 1) {
      return proof;
    }

    const treeLevel = this.tree[level];
    const siblingIdx = idx + (isOdd(idx) ? -1 : +1);
    proof.push(treeLevel[siblingIdx]);

    return this.generateProof(level + 1, Math.floor(idx / 2), proof);
  }

  getProofForKey(key) {
    return this.generateProof(0, this.getIndexForKey(key));
  }

  getRoot() {
    if (this.tree.length === 0) {
      return emptyRoot;
    }

    return this.tree[this.tree.length - 1][0];
  }

  verifyProof(proof, root, leaf) {
    let computedHash = leaf;

    proof.forEach(proofElement => {
      if (computedHash <= proofElement) {
        computedHash = this.hashIt(computedHash, proofElement);
      } else {
        computedHash = this.hashIt(proofElement, computedHash);
      }
    });

    return computedHash === root;
  }
}

export default SortedMerkleTree;
