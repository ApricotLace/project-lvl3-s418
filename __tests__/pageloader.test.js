import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import nock from 'nock';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { loadPage, writeLocalRes, constructPath } from '../src';

axios.defaults.adapter = httpAdapter;
const getPathToFixture = fixtureName => `${__dirname}/__fixtures__/${fixtureName}`;

describe('download test', () => {
  it('#succ 200', async () => {
    const host = 'https://localhost';
    nock(host)
      .get('/')
      .reply(200, 'test data');

    const response = await axios.get(host);
    expect(response.data).toBe('test data');
  });
  it('#succ download', async () => {
    const host = 'https://localhost';
    nock(host)
      .get('/')
      .reply(200, 'some html code goes here also a lot of tags');

    const tmpFilePath = await fs.mkdtemp(path.join(os.tmpdir(), 'fancytest'));
    const pathToWrittenFile = await loadPage(tmpFilePath, host);
    const writtenFile = await fs.readFile(pathToWrittenFile[0]);
    const fixture = await fs.readFile(getPathToFixture('testHtml.html'));
    expect(writtenFile.toString()).toBe(fixture.toString());
  });
});

describe('write&update test', () => {
  const link = 'http://localhost';
  beforeEach(() => {
    nock(link)
      .get('/')
      .replyWithFile(200, getPathToFixture('originalHtmlTest2.html'));

    nock(link)
      .get('/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js')
      .replyWithFile(200, getPathToFixture('testLocalRes'));

    nock(link)
      .get('/courses')
      .replyWithFile(200, getPathToFixture('originalHtmlTest2.html'));
  });
  it('#succ local download', async () => {
    const pathToTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hash'));
    const pathToResDir = await loadPage(pathToTmpDir, link);
    const dirContent = await fs.readdir(pathToResDir[1]);
    expect(dirContent.length).toBe(2);
  });

  it('#succ html update', async () => {
    const pathToTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hash'));
    await loadPage(pathToTmpDir, link);
    const fixture = await fs.readFile(getPathToFixture('originalHtmlTest2.html'));
    const dirContent = await fs.readdir(pathToTmpDir);
    const writtenFile = await fs.readFile(`${pathToTmpDir}/${dirContent[0]}`);
    expect(writtenFile.toString()).not.toBe(fixture.toString());
  });
});

describe('rawPageDownload fail', () => {
  const link = 'http://local';
  nock(link)
    .get('/')
    .reply(404);
  it('#fails', async () => {
    await expect(loadPage(os.tmpdir(), link)).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe('localResDownload fail', () => {
  const link = 'http://local';
  nock(link)
    .get('/test')
    .reply(404);
  it('#fails', async () => {
    const fakeLink = `${link}/test`;
    await expect(writeLocalRes(fakeLink, os.tmpdir())).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe('writeToExistingDir fail', () => {
  const link = 'http://local';
  const pathToTmpFile = path.join(os.tmpdir(), `${constructPath('', link, 1)}`);
  console.log(pathToTmpFile);
  console.log(os.tmpdir());
  beforeEach(() => fs.mkdir(pathToTmpFile));
  afterEach(() => fs.rmdir(pathToTmpFile));
  nock(link)
    .get('/')
    .replyWithFile(200, getPathToFixture('testHtml.html'));
  it('#fails', async () => {
    await expect(loadPage(os.tmpdir(), link)).rejects.toThrowErrorMatchingSnapshot();
  });
});
